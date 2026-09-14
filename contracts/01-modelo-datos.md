# 01 — Modelo de datos (MongoDB / Mongoose)

Cuatro colecciones. `courses`, `users`, `attendancerecords`. No hay colección
de calendario: el día lectivo se calcula (ver `00-dominio.md` §4).

## `courses`

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `name` | String | sí | Único, trim. Ej: `"Noveno A"` |
| `group` | String | sí | Enum `intervencion` \| `control` |
| `enrollment` | Number | sí | Matrícula activa del curso. Denominador de las métricas |
| `active` | Boolean | sí | Default `true`. Un curso inactivo sale de ranking y reportes |

Índices: `{ name: 1 }` único.

`enrollment` se guarda como número explícito, **no** se deriva contando
usuarios. Un estudiante matriculado que nunca se registró en el sistema sigue
contando como ausente, y ese es justamente el dato que importa.

## `users`

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `name` | String | sí | |
| `email` | String | sí | Único, lowercase, trim |
| `passwordHash` | String | sí | bcrypt |
| `role` | String | sí | Enum `profesor` \| `coordinacion` \| `estudiante` |
| `course` | ObjectId → Course | solo estudiante | |
| `document` | String | solo estudiante | Documento de identidad normalizado. Único, sparse. Solo lo ve coordinación |
| `qrToken` | String | solo estudiante | Único, sparse. 22+ chars aleatorios url-safe |
| `mustChangePassword` | Boolean | sí | Default `false`. `true` en todo alta hecha por coordinación |
| `active` | Boolean | sí | Default `true` |

Índices: `{ email: 1 }` único, `{ qrToken: 1 }` único sparse, `{ document: 1 }` único sparse,
`{ course: 1, role: 1 }`.

`qrToken` se genera con `crypto.randomBytes(16).toString("base64url")`. No
puede derivarse del email, del nombre ni de un contador.

## `attendancerecords`

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `student` | ObjectId → User | sí | |
| `course` | ObjectId → Course | sí | Denormalizado al momento del registro |
| `day` | String | sí | `"YYYY-MM-DD"` en Bogotá. Clave de agrupación diaria |
| `scannedAt` | Date | sí | Instante UTC real de la llegada |
| `status` | String | sí | Enum `temprano` \| `a_tiempo` \| `tarde` |
| `points` | Number | sí | 0..3 |
| `minutesLate` | Number | sí | Default 0. Ver `00-dominio.md` §5.2 |
| `source` | String | sí | Enum `qr` \| `manual` \| `import` |
| `scannedBy` | ObjectId → User | **no** | Profesor. Nulo cuando `source = "import"` |
| `justified` | Boolean | sí | Default `false` |
| `justification` | String | no | Texto libre, requerido si `justified = true` |
| `correctedBy` | ObjectId → User | no | Coordinación que editó el registro |
| `correctedAt` | Date | no | |

### Índices

```ts
schema.index({ student: 1, day: 1 }, { unique: true });  // un registro por día
schema.index({ course: 1, day: 1 });                     // ranking y reportes
schema.index({ day: 1 });
```

El índice único sobre `{ student, day }` es **obligatorio** y es lo que hace
segura la idempotencia del escaneo. El índice actual está declarado
`{ unique: false }` sobre `{ student, scannedAt }`, lo cual no deduplica nada,
porque `scannedAt` es un timestamp distinto en cada escaneo.

`scannedBy` pasa a opcional para permitir importar la línea base, que no tiene
profesor asociado.

### Idempotencia del escaneo

El controlador **no** hace `findOne` y después `create`. Eso es una condición
de carrera. Hace un único `create` y captura el error `E11000` del índice
único, respondiendo `409`. Ese es el contrato del que depende la cola offline.

## Ausencias

No se persisten. Se derivan por curso y día:

```
ausentes(curso, día) = curso.enrollment
                     - registros(curso, día)
                     - justificados(curso, día)
```

## Migración desde el esquema actual

1. Agregar `group`, `enrollment`, `active` a `courses`. Backfill manual.
2. Agregar `day`, `minutesLate`, `source`, `justified` a los registros
   existentes, calculando `day` desde `scannedAt` en Bogotá.
3. Eliminar el índice viejo `{ student: 1, scannedAt: 1 }`.
4. Crear el índice único `{ student: 1, day: 1 }`. Si falla por duplicados,
   resolverlos antes conservando el registro más temprano del día.
5. Agregar `mustChangePassword` y `active` a `users`.

Producción tiene 3 cursos y 0 registros de asistencia, así que la migración de
datos es prácticamente vacía. Ejecutarla antes de cargar la matrícula real.
