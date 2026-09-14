# 00 — Dominio y reglas de negocio

## 1. Zona horaria

Referencia única: `America/Bogota` (UTC-5, sin horario de verano).

Mongo persiste `Date` en UTC. Toda conversión a hora local se hace con
`Intl.DateTimeFormat` y la zona explícita. Está **prohibido** usar
`Date.prototype.getHours/getMinutes/getDate/setHours` para decidir
puntualidad, agrupar por día o construir rangos de consulta.

Helper canónico en backend: `src/utils/time.ts`

```ts
export const TZ = "America/Bogota";
export function toBogotaParts(d: Date): { day: string; minutes: number }
// day    -> "YYYY-MM-DD" en Bogotá
// minutes-> minutos desde medianoche en Bogotá (0..1439)
export function bogotaDayRangeUtc(day: string): { start: Date; end: Date }
```

## 2. Escaneo en portería

**Se escanea a todo estudiante que entra**, llegue temprano o tarde.

Consecuencia directa: un estudiante de un curso activo, en un día lectivo,
**sin registro**, es un **ausente**. El ausente no se almacena como fila; se
deriva comparando la matrícula del curso contra los registros de ese día.

Un estudiante tiene **como máximo un registro por día lectivo**. El segundo
escaneo del mismo día es un no-op idempotente y responde `409`.

## 3. Franjas de puntualidad

| Hora de llegada (Bogotá) | `status` | `points` |
|---|---|---|
| Antes de 07:20 | `temprano` | 3 |
| 07:20 a 07:30 inclusive | `a_tiempo` | 2 |
| Después de 07:30 | `tarde` | 0 |
| Sin registro en día lectivo | `ausente` (derivado) | 0 |

Constantes en `src/utils/attendanceRules.ts`. `EARLY_CUTOFF = 07:20`,
`LATE_CUTOFF = 07:30`.

`ausente` **no** es un valor del enum persistido en Mongo. Existe solo en DTOs
de lectura y reportes.

## 4. Calendario lectivo

Un día es lectivo si cumple las tres condiciones:

1. Es lunes a viernes en Bogotá.
2. No está en la lista de festivos colombianos.
3. Está dentro del rango del periodo consultado.

Festivos en constante `src/utils/holidays.ts`, array de strings `"YYYY-MM-DD"`.
No hay colección en Mongo ni pantalla de administración para esto en el piloto.

> **Pendiente de confirmar**: lista de festivos y de jornadas especiales
> (izadas de bandera, salidas pedagógicas, días sin clase) que caigan dentro
> del periodo de medición.

## 5. Métricas del piloto

### 5.1 Porcentaje de puntualidad por curso

Es el indicador principal, el que se le prometió a rectoría y el que ordena
el ranking.

```
puntualesDia   = registros del curso ese día con status "temprano" o "a_tiempo"
denominadorDia = matrícula activa del curso - justificados de ese día
pctDia         = puntualesDia / denominadorDia
pctPeriodo     = suma(puntualesDia) / suma(denominadorDia)   // sobre días lectivos
```

`pctPeriodo` se pondera por día, **no** es el promedio de los `pctDia`. Así un
día con menos asistencia no pesa igual que uno completo.

Si `denominadorDia` es 0, el día se excluye del cálculo.

### 5.2 Minutos de clase perdidos

```
horaInicioClase = 07:30 Bogotá        // confirmado 2026-09-12
minutosPerdidos(registro) = max(0, minutosBogota(scannedAt) - 450)
```

450 = 07:30 expresado en minutos desde medianoche. Solo los registros con
`status = "tarde"` aportan minutos. El ausente **no** aporta minutos perdidos,
se reporta aparte como ausencia.

Se reporta el total del periodo por curso y el promedio por estudiante.

> **Confirmado (2026-09-12)**: la clase inicia a las 07:30, igual que el cierre
> de portería. Si cambia, se cambia solo la constante, no la fórmula.

### 5.3 Ausencias

```
ausentesDia = matrícula activa - registros del día - justificados del día
```

## 6. Grupos del experimento

Cada curso pertenece a un grupo: `intervencion` o `control`.

- **Intervención**: 3 cursos. Ven el ranking, reciben el incentivo grupal.
- **Control**: 3 cursos. Se les registra la asistencia igual, pero **no
  aparecen en el ranking público** ni reciben incentivo.

> **Decisión del piloto (2026-09-13)**: Noveno, Décimo y Once participan todos
> como `intervencion`, sin grupo de control, para que el ranking compita entre
> los tres cursos.

El endpoint público de ranking devuelve **únicamente** cursos de intervención.
Los cursos de control existen solo en reportes de coordinación.

> **Pendiente de confirmar**: los 6 nombres de curso, cuáles son control, y la
> matrícula de cada uno.

## 7. Periodos de medición

| Periodo | Fuente del dato | Duración |
|---|---|---|
| Línea base | Planillas físicas, transcritas e importadas por CSV | 2 semanas |
| Piloto | Escaneo en portería | 2 semanas |

Los registros de línea base entran por importación, con `source = "import"` y
sin `scannedBy`. Se computan con las mismas reglas de puntualidad.

Fechas vigentes, en `src/config/periods.ts`:

- **Piloto de prueba del sistema**: lunes 2026-09-14 a viernes 2026-09-18.
- **Línea base**: pendiente de confirmar.

### 7.1 Ventana del ranking público

`GET /api/ranking` evalúa los días lectivos desde el inicio del piloto hasta
`min(hoy, fin del piloto)`, en Bogotá. El día en curso solo entra después de
las 07:30, cuando el conteo de puntuales ya es definitivo. Antes del inicio
del piloto el ranking responde `[]`.

## 8. Justificaciones

Coordinación puede marcar un registro, o una ausencia, como justificada
(excusa médica, permiso, cita). Un día justificado sale del denominador del
curso: no cuenta como puntual ni como ausente.

## 9. Identidad del estudiante

El estudiante se identifica en portería por `qrToken`, un identificador
opaco, aleatorio y único por estudiante.

Doble canal, ambos válidos:

1. **Carnet impreso** con el QR. Canal principal, no requiere celular.
2. **Perfil en la web**, que muestra el mismo QR en pantalla. Respaldo para
   el estudiante que olvidó el carnet y lleva dispositivo.

El `qrToken` nunca viaja en una respuesta pública ni aparece en el ranking.
Solo lo reciben el propio estudiante y coordinación.
