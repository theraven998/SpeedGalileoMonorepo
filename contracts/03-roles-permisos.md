# 03 — Roles y autorización

Tres roles: `profesor`, `coordinacion`, `estudiante`. El rol se asigna al
crear el usuario y no es editable por el propio usuario.

Los roles **no** heredan entre sí. Coordinación no puede escanear en portería
y un profesor no ve el detalle individual de otros cursos. Cada ruta declara
su rol explícitamente con `requireRole`.

## Matriz

| Ruta | 🌐 | 🎓 estudiante | 🏫 profesor | 🗂 coordinación |
|---|:--:|:--:|:--:|:--:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/signup-estudiante` | ✅ | — | — | — |
| `POST /auth/register` | ❌ | ❌ | ❌ | ✅ |
| `GET /auth/me` | ❌ | ✅ | ✅ | ✅ |
| `PATCH /auth/me` | ❌ | ✅ | ✅ | ✅ |
| `PATCH /auth/me/password` | ❌ | ✅ | ✅ | ✅ |
| `GET /students/me/qr` | ❌ | ✅ | ❌ | ❌ |
| `GET /attendance/me` | ❌ | ✅ | ❌ | ❌ |
| `POST /attendance/scan` | ❌ | ❌ | ✅ | ❌ |
| `GET /attendance` | ❌ | ❌ | ❌ | ✅ |
| `POST /attendance/manual` | ❌ | ❌ | ❌ | ✅ |
| `PATCH /attendance/:id` | ❌ | ❌ | ❌ | ✅ |
| `POST /attendance/import` | ❌ | ❌ | ❌ | ✅ |
| `GET /courses` | ✅ | ✅ | ✅ | ✅ |
| `GET /courses/admin` | ❌ | ❌ | ❌ | ✅ |
| `POST /courses`, `PATCH /courses/:id` | ❌ | ❌ | ❌ | ✅ |
| `POST /students` | ❌ | ❌ | ❌ | ✅ |
| `GET /students` | ❌ | ❌ | ❌ | ✅ |
| `POST /students/import` | ❌ | ❌ | ❌ | ✅ |
| `GET /students/cards` | ❌ | ❌ | ❌ | ✅ |
| `GET /ranking` | ✅ | ✅ | ✅ | ✅ |
| `GET /reports/summary` | ❌ | ❌ | ❌ | ✅ |
| `GET /reports/export.csv` | ❌ | ❌ | ❌ | ✅ |

## Aislamiento de datos

- Un estudiante solo lee **sus propios** registros. `GET /attendance/me` filtra
  siempre por `req.user.sub`, nunca por un id que venga del cliente.
- El profesor de portería recibe únicamente nombre y curso del estudiante que
  acaba de escanear. No tiene endpoint de listado ni de búsqueda.
- Solo coordinación ve el detalle individual, tal como se declaró en la carta
  a rectoría.

## JWT

- Payload: `{ sub, role, iat, exp }`. Nada más. El nombre y el curso se
  consultan con `GET /auth/me`.
- Vigencia: 8 horas.
- `JWT_SECRET` es obligatorio. El backend **aborta el arranque** si la
  variable no está definida. Está prohibido el fallback literal en el código,
  que hoy existe en `src/config/env.ts:16` y es público en el repositorio.

## Datos de menores de edad

Los estudiantes del piloto son menores. Reglas no negociables:

1. Ninguna respuesta sin JWT contiene datos que identifiquen a un estudiante.
2. El ranking público es agregado por curso, sin conteos que permitan
   reconstruir quién llegó tarde en cursos pequeños.
3. `qrToken` se trata como credencial: nunca en logs, nunca en URLs de `GET`,
   nunca en una respuesta pública.
4. La carta a rectoría declara que se recogen nombre, curso, código de carnet
   y hora de llegada. El sistema además guarda correo y contraseña, necesarios
   para el login del estudiante. Esto debe quedar explícito en el addendum.

## Endurecimiento mínimo antes del piloto

- `helmet` activo.
- CORS restringido al dominio de Firebase Hosting, sin comodín.
- Rate limit en login y autorregistro.
- El backend rechaza arrancar sin `JWT_SECRET` ni `MONGO_URI`.
