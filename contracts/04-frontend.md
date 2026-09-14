# 04 — Contrato de frontend

Next.js App Router, `output: "export"` estático a Firebase Hosting. Todas las
páginas son client components. No hay Server Actions, ni route handlers, ni
`generateStaticParams` con datos de Mongo. Cualquier propuesta que dependa de
runtime de servidor está fuera de contrato.

## Rutas

| Ruta | Acceso | Propósito |
|---|---|---|
| `/` | 🌐 | Landing. Explica el piloto y enlaza a ranking y login |
| `/ranking` | 🌐 | Tablero por curso, solo intervención, sin nombres |
| `/login` | 🌐 | Ingreso. Redirige según rol |
| `/registro` | 🌐 | Autorregistro de estudiante con código de invitación |
| `/perfil` | 👤 | **Nuevo.** Datos, cambio de contraseña, cerrar sesión |
| `/perfil/carnet` | 🎓 | **Nuevo.** QR a pantalla completa, listo para escanear o imprimir |
| `/estudiante` | 🎓 | Historial propio y ranking |
| `/porteria` | 🏫 | Escáner QR |
| `/coordinacion` | 🗂 | Detalle individual y filtros |
| `/coordinacion/cursos` | 🗂 | **Nuevo.** CRUD de cursos, grupo y matrícula |
| `/coordinacion/estudiantes` | 🗂 | **Nuevo.** Alta masiva CSV y descarga de carnets |
| `/coordinacion/registros` | 🗂 | **Nuevo.** Registro manual, corrección, justificación |
| `/coordinacion/reportes` | 🗂 | **Nuevo.** Métricas del piloto y exportación CSV |

`ROLE_HOME` en `src/lib/api.ts` mapea rol a ruta de aterrizaje tras el login.

## Guards

`RouteGuard` envuelve toda ruta no pública. Comportamiento obligatorio:

1. Sin token → redirige a `/login`.
2. Token con rol que no corresponde a la ruta → redirige a su `ROLE_HOME`.
3. `mustChangePassword = true` → fuerza `/perfil` hasta que cambie la clave.
4. Cualquier `401` del API → limpia el token y redirige a `/login`.

Mientras se resuelve la sesión se muestra un estado de carga. Nunca se
renderiza contenido protegido antes de verificar el rol, ni siquiera un frame.

## Estados obligatorios por pantalla

Toda pantalla que consuma el API implementa los cuatro, sin excepción:

| Estado | Requisito |
|---|---|
| Cargando | Esqueleto o spinner. Si pasan 5 s, texto explicando que el servidor está despertando |
| Error | Mensaje en español y botón de reintentar. Nunca un `alert` ni la consola |
| Vacío | Texto que explica qué falta y qué hacer, no una tabla en blanco |
| Con datos | El caso normal |

El cold start de Render es de 30 a 50 segundos. El aviso de servidor
despertando no es un detalle estético: sin él, el usuario recarga la página y
duplica la espera.

## `/porteria` — requisitos específicos

Es la pantalla crítica del piloto. Se opera de pie, con una fila de
estudiantes esperando.

- **Feedback inmediato** por escaneo: color, texto grande con el nombre, y
  sonido distinto para éxito, duplicado y error.
- **Cola offline** en `localStorage` para el `POST /attendance/scan`. Ya está
  especificada en `code/Pendientes/prompt-logica-backupoffline.txt`.
  Depende del índice único `{ student, day }` del contrato de datos. No se
  implementa antes que ese índice exista.
- **El `409` no es un error visible.** Se muestra como "ya registrado hoy",
  en un color neutro, y se saca de la cola.
- **Nunca bloquear la fila.** Un escaneo pendiente de sincronizar no impide el
  siguiente. La UI no espera confirmación del servidor para aceptar otro QR.
- **Indicador de cola**: cuántos escaneos faltan por sincronizar, visible
  mientras haya pendientes.
- **Respaldo sin cámara**: enlace a búsqueda por nombre para registrar a mano.
  Si la cámara no abre, el profesor tiene que poder seguir trabajando.

## Cliente API

`src/lib/api.ts` es el único punto que habla con el backend.

- Timeout de 60 s, por el cold start.
- Adjunta el `Bearer` automáticamente cuando hay token.
- Lanza `ApiError` con `status` y `message` legibles.
- Un `401` dispara el cierre de sesión global una sola vez, no una por
  petición en vuelo.

## Tipos

`src/lib/contracts.ts` replica `contracts/types.ts`. Ningún componente define
a mano la forma de una respuesta del API.

## Responsive y accesibilidad

El profesor usa celular en la puerta. Coordinación usa escritorio. El
estudiante usa ambos.

- Objetivos táctiles de 44 px como mínimo en `/porteria`.
- El QR del carnet se renderiza con el contraste máximo y sin animación.
- Contraste mínimo AA en el tablero de ranking, que se proyecta en pantalla.
