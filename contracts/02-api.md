# 02 — Contrato de API HTTP

Base: `/api`. Auth por `Authorization: Bearer <jwt>`.
Todo error responde `{ "error": "<mensaje en español>" }`.

Leyenda de acceso: 🌐 público · 👤 autenticado · 🎓 estudiante · 🏫 profesor · 🗂 coordinación

---

## Auth

### `POST /api/auth/login` 🌐
```jsonc
// req
{ "email": "string", "password": "string" }
// 200
{ "token": "jwt", "user": { "id","name","email","role","courseName?","mustChangePassword" } }
// 401 credenciales inválidas · 403 usuario inactivo
```

### `GET /api/auth/me` 👤
```jsonc
{ "id","name","email","role","course": { "id","name" } | null,
  "qrToken": "string | null",   // solo si role = estudiante
  "mustChangePassword": false }
```

### `PATCH /api/auth/me` 👤
`{ "name"? }` → perfil actualizado. El correo y el curso no son editables por el propio usuario.

### `PATCH /api/auth/me/password` 👤
`{ "currentPassword","newPassword" }` → `204`. `400` si la nueva tiene menos de 8 caracteres. `401` si la actual no coincide.
Al cambiarla deja `mustChangePassword = false`. La nueva no puede ser igual a la actual (`400`).

---

## Estudiante

### `GET /api/students/me/qr` 🎓
```jsonc
{ "qrToken": "string", "dataUrl": "data:image/png;base64,..." }
```
PNG del QR listo para mostrar en pantalla o imprimir. Generado con la
dependencia `qrcode`, ya instalada y hoy sin usar.

### `GET /api/attendance/me` 🎓
```jsonc
[ { "day":"2026-09-10", "scannedAt":"ISO", "status":"temprano",
    "points":3, "minutesLate":0, "justified":false } ]
```
Orden descendente por `day`.

---

## Portería

### `POST /api/attendance/scan` 🏫
```jsonc
// req
{ "qrToken": "string" }
// 201
{ "student": { "id","name" }, "course": { "id","name" },
  "day":"2026-09-10", "status":"a_tiempo", "points":2,
  "minutesLate":0, "scannedAt":"ISO" }
// 403 Portería cerrada (solo si SCAN_WINDOW_ENFORCED=true y fuera de la ventana)
// 404 QR no corresponde a un estudiante activo con curso
// 409 { "error":"Este estudiante ya tiene registro hoy",
//       "existing": { "day","status","points","scannedAt" } }
```

El `409` incluye el registro existente para que la cola offline pueda
descartar el pendiente y la UI pueda mostrar qué pasó ese día.

`scannedAt` lo fija **siempre el servidor**. El cliente nunca envía la hora,
ni siquiera desde la cola offline: si un escaneo se reintenta al día
siguiente, es un caso de corrección manual, no de sincronización.

### `POST /api/attendance/practice-scan` 🏫
Modo práctica para capacitación. Mismo req y misma forma de respuesta que
`/scan` más `"practice": true`, pero **no guarda nada** y no aplica la
ventana horaria. `200` o `404`.

### `GET /api/attendance/scan-config` 🏫🗂
```jsonc
{ "windowEnforced": false, "windowStartMin": 360, "windowEndMin": 510 }
```
Ventana de portería en minutos desde medianoche (Bogotá). Se configura con
`SCAN_WINDOW_ENFORCED` / `SCAN_WINDOW_START` / `SCAN_WINDOW_END` (`HH:mm`).
Con `windowEnforced=false` se registra a cualquier hora; fuera de 07:30 queda `tarde`.

---

## Coordinación — asistencia

### `GET /api/attendance` 🗂
Query: `courseId?`, `from?` (`YYYY-MM-DD`), `to?`, `status?`, `page?`, `limit?` (default 50, máx 200).
```jsonc
{ "items":[ { "id","student":{"id","name"},"course":{"id","name"},
             "day","scannedAt","status","points","minutesLate",
             "source","justified","justification" } ],
  "page":1, "limit":50, "total":0 }
```

### `POST /api/attendance/manual` 🗂
Respaldo cuando falla la cámara. La hora la escribe coordinación.
```jsonc
{ "studentId","day":"YYYY-MM-DD","time":"07:24","note"? }
// 201 registro · 409 ya existe registro ese día
```

### `PATCH /api/attendance/:id` 🗂
`{ "time"?, "justified"?, "justification"?, "note"? }`
Recalcula `status`, `points` y `minutesLate`. Sella `correctedBy` y `correctedAt`.

### `POST /api/attendance/import` 🗂
Línea base desde planillas transcritas. `multipart/form-data`, campo `file` (CSV).
Columnas: `email,day,time` · `time` vacío significa ausente y no genera fila.
```jsonc
{ "inserted":0, "skipped":0,
  "errors":[ { "row":12, "reason":"email no encontrado" } ] }
```
Importación idempotente: una fila que choca con el índice único se cuenta en
`skipped`, no aborta el lote.

---

## Coordinación — cursos y estudiantes

### `GET /api/courses` 🌐
Público: solo expone nombres de curso. No existe autorregistro: toda cuenta de
estudiante la crea coordinación con `POST /api/students`.
```jsonc
[ { "id","name" } ]
```
**No** expone `group` ni `enrollment`. Publicar qué curso es control invalida
el experimento.

### `GET /api/courses/admin` 🗂
`[ { "id","name","group","enrollment","active","registered" } ]`
`registered` = usuarios estudiante activos en ese curso.

### `POST /api/courses` · `PATCH /api/courses/:id` 🗂
`{ "name","group","enrollment","active" }`

### `POST /api/students` 🗂
Alta individual hecha por coordinación. Los estudiantes no usan celular en el
colegio. Es la **única** vía de alta de estudiantes: no hay autorregistro público.
```jsonc
// req
{ "name":"string", "email":"string", "document":"string", "courseId":"string" }
// 201
{ "student": AdminStudentDto, "tempPassword":"string", "qrToken":"string" }
// 400 datos inválidos · 404 curso no existe o inactivo
// 409 { "error":"Ya existe un estudiante con el documento 1034567890: Ana Pérez (Noveno)" }
// 409 { "error":"Ya existe un usuario con el correo ana@correo.com" }
```
- `document` se normaliza antes de validar y guardar: sin espacios, puntos ni
  guiones, en mayúsculas. Debe quedar con 5 a 15 caracteres `A-Z0-9`.
- `email` se guarda en minúsculas y sin espacios.
- El duplicado se detecta con el `E11000` de los índices únicos, no con una
  consulta previa. El `409` nombra el campo repetido y, si es el documento, a
  quién pertenece.
- `tempPassword`: 10 caracteres aleatorios sin símbolos ambiguos. Se devuelve
  **una sola vez** y no se persiste en claro. El usuario queda con
  `mustChangePassword = true`.

### `GET /api/students?courseId=` 🗂
`AdminStudentDto[]` ordenado por `name`. Sin `courseId` devuelve todos los
estudiantes. Nunca incluye `qrToken` ni `passwordHash`.

### `POST /api/students/import` 🗂
Alta masiva. `multipart/form-data`, campo `file` (CSV).
Columnas: `name,email,courseName`.
Genera `qrToken` y contraseña temporal, marca `mustChangePassword = true`.
```jsonc
{ "created":0, "skipped":0,
  "credentials":[ { "email","tempPassword" } ],
  "errors":[ { "row","reason" } ] }
```
`credentials` se devuelve **una sola vez**, en esta respuesta. No se persiste
la contraseña en claro.

### `GET /api/students/cards?courseId=` 🗂
`application/pdf`. Carnets imprimibles del curso, con nombre, curso y QR.

---

## Ranking y reportes

### `GET /api/ranking` 🌐
```jsonc
[ { "courseId","courseName","pctPuntual":0.87,
    "diasEvaluados":10, "posicion":1 } ]
```
Solo cursos con `group = "intervencion"` y `active = true`. Ordenado por
`pctPuntual` descendente. Empate: se comparte posición.
Ventana de días: ver `00-dominio.md` §7.1. Sin días evaluables responde `[]`.

Nunca incluye nombres de estudiantes, conteos individuales, ni cursos de
control. Es la única respuesta del sistema visible sin login junto con
`GET /api/courses`.

### `GET /api/reports/summary?from&to` 🗂
```jsonc
[ { "courseId","courseName","group",
    "enrollment":32, "diasLectivos":10,
    "puntuales":270, "tarde":25, "ausentes":25, "justificados":5,
    "pctPuntual":0.87, "minutosPerdidos":412,
    "minutosPerdidosPorEstudiante":12.9 } ]
```
Incluye intervención y control. Es la base del informe a rectoría.

### `GET /api/reports/export.csv?from&to&courseId` 🗂
`text/csv`. Una fila por estudiante y día lectivo, incluidas las ausencias.
Columnas: `curso,grupo,estudiante,email,day,status,points,minutesLate,justified,source`.

---

## Reglas transversales

- **Rate limit**: `POST /api/auth/login` limitado a 10 intentos por IP cada 15 minutos.
- **401 en el cliente**: cualquier `401` borra el token y redirige a `/login`.
- **Cold start**: el frontend asume que la primera petición tras inactividad
  puede tardar 50 segundos. No hay timeout menor a 60 s en el cliente.
