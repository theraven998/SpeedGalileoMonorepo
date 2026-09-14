# PROMPT — Ejecutar Ola 1 de SpeedGalileo

> Archivo autocontenido. Pégalo como primer mensaje en una sesión nueva de
> Claude Code, desde `/home/raven/Proyects/Clientes/GradoDiegui`.
> No necesitas el contexto de la sesión anterior.

---

## Instrucción para el agente

Vas a ejecutar la **Ola 1** del proyecto SpeedGalileo: cinco correcciones de
backend que hoy hacen que el piloto no pueda correr ni producir datos válidos.

**Antes de escribir una sola línea de código:**

1. Lee completo el directorio `contracts/`. Es la fuente única de verdad del
   sistema. Si el código y el contrato discrepan, gana el contrato.
2. Lee `docs/AUDITORIA_FLUJO.md`, la auditoría que originó este trabajo.
3. Hazle al usuario las preguntas de la sección **"Preguntas pendientes"** de
   este archivo, usando `AskUserQuestion`. Sin esas respuestas hay constantes
   que quedarían inventadas.
4. Espera la respuesta. Entonces empieza.

**Modo de trabajo pedido por el usuario:** delega la escritura de código a
subagentes con `model: "sonnet"`, agrupando por archivo para que no se pisen.
Tú revisas el resultado contra el contrato antes de darlo por bueno.

---

## Contexto del proyecto

**SpeedGalileo** — sistema de registro de puntualidad con QR y ranking por
curso para el Gimnasio Galileo Galilei. Es el proyecto de grado de un
estudiante, y va a correr como piloto real en el colegio.

| Pieza | Detalle |
|---|---|
| Repo | `/home/raven/Proyects/Clientes/GradoDiegui`, rama `main` |
| Frontend | `code/frontend` — Next.js 16 App Router, TS + Tailwind, todo client components, `output: "export"` estático a Firebase Hosting |
| Backend | `code/backend` — Express + TS + Mongoose + JWT, alias `@/`, ESM con extensión `.js` en los imports |
| Despliegue | Backend en Render free tier, Mongo Atlas M0, frontend en `speedgalileo-galileo.web.app` |
| Gestor | `pnpm` |

**Roles:** `profesor` escanea en portería, `coordinacion` ve el detalle
individual y administra, `estudiante` ve su historial y su QR, el público ve
landing y ranking sin login.

**Estado de producción:** 3 cursos, 0 registros de asistencia. La migración de
datos es prácticamente vacía. Ejecutarla antes de cargar la matrícula real.

**Nota de entorno:** `code/backend/node_modules` no está instalado. Corre
`pnpm install` en `code/backend` antes de compilar o no habrá `tsc`.

---

## Decisiones ya tomadas por el usuario

No las vuelvas a preguntar.

| Tema | Decisión |
|---|---|
| Identificación | QR impreso en carnet. El estudiante que lleve dispositivo puede mostrar el mismo QR desde su perfil. Se descarta NFC |
| Alcance del escaneo | Se escanea a **todos** los que entran, no solo a los que llegan tarde. Por tanto, quien no tiene registro en un día lectivo es **ausente** |
| Fórmula del ranking | Porcentaje de puntuales sobre la matrícula del curso, ponderado por día lectivo |
| Minutos perdidos | Diferencia entre la hora de escaneo y la hora oficial de inicio de clase, solo para los `tarde` |
| Calendario | Lunes a viernes, sin festivos, con lista fija en código. Sin pantalla de administración de calendario en el piloto |
| Línea base | Las planillas físicas se están rellenando a conciencia estas dos semanas. Se importarán después por CSV. El OCR anterior salió inservible y se descarta |

Tres decisiones de diseño ya escritas en los contratos, confírmalas de paso
pero no las rediseñes:

- La matrícula es un número explícito en el curso, no un conteo de usuarios.
  Un estudiante matriculado que nunca entró al sistema igual debe contar como
  ausente.
- Un día justificado sale del denominador. No cuenta como puntual ni como
  ausente.
- El escaneo duplicado se resuelve capturando el error `E11000` del índice
  único, no con una consulta previa. `findOne` y después `create` es una
  condición de carrera.

---

## Alcance: Ola 1

Solo backend. **No toques el frontend en esta ola.**

### Tarea 1 — Zona horaria

**El bug más grave del sistema.** `code/backend/src/utils/attendanceRules.ts:9`
usa `scannedAt.getHours()`, que devuelve la hora local del servidor. Render
corre en UTC. Una llegada a las 7:15 de Bogotá se lee como 12:15 y cae en
`tarde` con 0 puntos. Le pasaría a todos los estudiantes, todos los días, y
falla en silencio: no hay error, solo datos incorrectos.

- Crear `code/backend/src/utils/time.ts` con los helpers que define
  `contracts/00-dominio.md` §1: `TZ`, `toBogotaParts`, `bogotaDayRangeUtc`.
  Implementarlos con `Intl.DateTimeFormat` y zona explícita.
- Crear `code/backend/src/utils/holidays.ts` con los festivos colombianos como
  array de `"YYYY-MM-DD"`, más el helper `isLectivo(day)` que aplica las tres
  condiciones de `contracts/00-dominio.md` §4.
- Reescribir `attendanceRules.ts` para que calcule sobre los minutos de Bogotá
  y devuelva también `minutesLate`, según la fórmula de §5.2.
- Prohibido en todo el backend, para lógica de negocio: `getHours`,
  `getMinutes`, `getDate`, `setHours`. Búscalos con grep y elimínalos.

### Tarea 2 — Índice único e idempotencia

`code/backend/src/models/AttendanceRecord.ts:19-22` declara el índice
`{ unique: false }` sobre `{ student, scannedAt }`, contradiciendo su propio
comentario. No deduplica nada, porque `scannedAt` es distinto en cada escaneo.

- Agregar el campo `day` de tipo String, obligatorio, según
  `contracts/01-modelo-datos.md`.
- Eliminar el índice viejo. Crear `{ student: 1, day: 1 }` **único**, más
  `{ course: 1, day: 1 }` y `{ day: 1 }`.
- Reescribir `scanQr` en `code/backend/src/controllers/attendanceController.ts`
  para que haga un único `create` y capture `E11000`, respondiendo `409` con
  el cuerpo `ScanConflictResponse` del contrato, que incluye el registro
  existente.
- Borrar el helper `startOfDay` del controlador. Es justamente el que rompe la
  zona horaria.

> **Dependencia hacia adelante:** la cola offline especificada en
> `code/Pendientes/prompt-logica-backupoffline.txt` asume que este índice único
> existe. No la implementes en esta ola, pero no la implementes nunca antes de
> esta tarea o generará registros duplicados.

### Tarea 3 — Campos de curso

`code/backend/src/models/Course.ts` solo guarda `name`. Faltan los tres campos
que sostienen el experimento y las métricas.

- Agregar `group` (`intervencion` \| `control`), `enrollment` (número) y
  `active` (booleano, default `true`).
- `GET /api/courses` es público y **no** puede exponer `group` ni
  `enrollment`. Publicar qué curso es de control invalida el experimento.
  Devuelve solo `id` y `name`.
- Agregar `GET /api/courses/admin`, solo coordinación, con la forma
  `AdminCourseDto` del contrato.

### Tarea 4 — Matrícula y ausentes

Hoy solo existen filas de quien escaneó, así que el indicador prometido a
rectoría, el porcentaje de puntualidad por curso, no tiene denominador.

- El ausente **no** se persiste. Se deriva:
  `enrollment - registros(día) - justificados(día)`.
- Agregar al modelo de registro los campos que faltan del contrato:
  `minutesLate`, `source`, `justified`, `justification`, `correctedBy`,
  `correctedAt`. Hacer `scannedBy` **opcional**, porque la importación de la
  línea base no tiene profesor asociado.
- Implementar `GET /api/reports/summary?from&to`, solo coordinación, con la
  forma `CourseSummaryDto`. Incluye cursos de intervención y de control. Es la
  base del informe a rectoría.

### Tarea 5 — Ranking con denominador

`code/backend/src/controllers/rankingController.ts:12` hace
`$avg: "$points"` sobre los registros existentes. El curso donde solo escanean
los puntuales queda primero. Premia el no-registro e invalida el experimento.

- Reescribirlo según `contracts/00-dominio.md` §5.1 y la forma
  `RankingEntryDto`.
- Ponderado por día lectivo: suma de puntuales sobre suma de denominadores.
  **No** es el promedio de los porcentajes diarios.
- Devolver **solo** cursos con `group = "intervencion"` y `active = true`.
- Empates comparten posición.
- Ningún nombre de estudiante, ningún conteo que permita reconstruir quién
  llegó tarde.

### Tarea 6 — Migración y semilla

- Script `code/backend/src/utils/migrate.ts` con los cinco pasos de
  `contracts/01-modelo-datos.md`, sección "Migración desde el esquema actual".
  Idempotente: correrlo dos veces no puede romper nada.
- Actualizar `code/backend/src/utils/seed.ts` a los campos nuevos.
- Replicar `contracts/types.ts` **sin modificar** en
  `code/backend/src/types/contracts.ts`, y usar esos tipos en los
  controladores.

---

## Fuera de alcance

No lo hagas en esta ola aunque lo veas roto:

- Cualquier archivo bajo `code/frontend`.
- La cola offline de portería.
- Alta masiva de estudiantes, generación de carnets en PDF, importación de la
  línea base, registro manual y corrección. Son Ola 2.
- El endurecimiento de seguridad: `helmet`, rate limit, y quitar el fallback
  público de `JWT_SECRET` en `code/backend/src/config/env.ts:16`. Está
  priorizado, pero como bloque aparte con su propia revisión.

Si encuentras un problema fuera de alcance, anótalo al final de tu reporte en
vez de arreglarlo.

---

## Verificación antes de dar por terminado

1. `cd code/backend && pnpm install && pnpm run build` compila sin errores.
2. `grep -rnE "getHours|getMinutes|setHours|getDate\(" code/backend/src`
   no devuelve nada en lógica de negocio.
3. `pnpm run seed` corre limpio sobre una base vacía.
4. Prueba real de idempotencia: escanear dos veces el mismo `qrToken` el mismo
   día devuelve `201` y luego `409` con el registro existente en el cuerpo.
5. Prueba de zona horaria: un registro creado a las 7:15 de Bogotá queda con
   `status = "temprano"` y `day` correcto, **verificado con `TZ=UTC` en el
   entorno**, que es como corre Render. Esta prueba es la que importa.
6. `GET /api/ranking` con datos sembrados no incluye cursos de control y
   ordena por porcentaje, no por promedio de puntos.
7. `GET /api/courses` sin token no expone `group` ni `enrollment`.

No declares la ola terminada hasta que los siete pasen. Si alguno falla,
repórtalo con la salida exacta en vez de darlo por bueno.

---

## Preguntas pendientes

Hazlas al inicio con `AskUserQuestion`. Están marcadas también dentro de los
contratos como "PENDIENTE DE CONFIRMAR".

1. **Hora oficial de inicio de clase.** Es la base de los minutos perdidos.
   Está asumida en 07:30, igual que el cierre de portería, en
   `contracts/types.ts` como `CLASS_START_MIN`. ¿Se confirma o es otra?
2. **Los seis cursos.** Nombre exacto de cada uno, cuáles tres son de control,
   y la matrícula de cada uno. Sin esto no hay denominador ni semilla real.
3. **Fechas.** Inicio y fin de la línea base, e inicio y fin del piloto.
4. **Festivos y jornadas especiales** que caigan dentro de esos rangos. Izadas
   de bandera, salidas pedagógicas, días sin clase.
5. **Correo del estudiante.** Quedó bloqueado para edición por el propio
   usuario en `contracts/02-api.md`. ¿Se mantiene así?

Si el usuario aún no tiene los datos 2, 3 o 4, sigue adelante: deja las
constantes vacías con un `TODO` visible y repórtalo. Las tareas 1, 2, 3 y 5 no
dependen de esas respuestas. La pregunta 1 sí bloquea el cálculo de minutos
perdidos de la tarea 4.

---

## Al terminar

Reporta en este orden: qué quedó implementado por tarea, la salida de los
siete pasos de verificación, los problemas fuera de alcance que encontraste, y
qué sigue en la Ola 2.

No hagas commit ni push salvo que el usuario lo pida.
