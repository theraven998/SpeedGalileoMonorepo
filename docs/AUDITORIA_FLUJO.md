# Auditoría de flujo — SpeedGalileo

**Fecha:** 2026-09-10
**Alcance:** código en `code/frontend`, `code/backend`, documentación en `docs/`, despliegue (Firebase Hosting + Render + Atlas M0) y compromiso institucional de `docs/SOLICITUD_AUTORIZACION.md`.
**Método:** lectura completa de los 6 controllers/routes/models/utils del backend, las 6 páginas y 4 componentes del frontend, configuración de build y verificación en vivo contra `https://speedgalileomonorepo.onrender.com`.

---

## 1. Resumen ejecutivo

El sistema tiene el camino feliz cerrado punta a punta (autorregistro → QR en pantalla → escaneo en portería → historial → ranking público sin nombres), y la privacidad comprometida con la institución se respeta: ningún endpoint público devuelve nombres. Pero el piloto **no puede correr todavía**, y no por deuda técnica sino por tres huecos duros:

1. **Zona horaria**: `computeAttendance` usa la hora local del servidor (`attendanceRules.ts:9`). Render corre en UTC, así que 7:15 a.m. Bogotá se evalúa como 12:15 → **todos los estudiantes reciben 0 pts, "tarde"**, en silencio. Hoy el sistema produciría un dataset inservible desde el primer día.
2. **No existe el concepto de ausente ni de matrícula por curso**: solo hay registros de quien escaneó. El indicador comprometido con rectoría — *"% de llegadas puntuales por curso"* — no tiene denominador y es imposible de calcular. Peor: el ranking actual (`avg` de puntos sobre registros existentes) **premia al curso donde los impuntuales simplemente no se escanean**.
3. **No hay forma de poner el QR en manos de los estudiantes ni de dar de alta 6 cursos**: no hay generación/impresión de carnets en lote, no hay importación de estudiantes, y producción solo tiene 3 cursos (verificado en vivo) contra los 6 (3 intervención + 3 control) prometidos; `Course` ni siquiera tiene campo para distinguirlos.

Añadido crítico: no existe registro manual de respaldo, ni corrección de registros, ni exportación de datos — o sea, si la cámara falla un día ese día se pierde, y el informe final para la institución no se puede producir desde el sistema.

---

## 2. Mapa del flujo actual (verificado en código)

### Lo que sí funciona

| Flujo | Implementación | Estado |
|---|---|---|
| Landing pública | `code/frontend/src/app/page.tsx:11-43` — hero, pasos, escala de puntos, preview de ranking en vivo (`:228-268`) | OK |
| Ranking público sin login | `code/frontend/src/app/ranking/page.tsx:8-55` ← `GET /api/ranking` (`code/backend/src/routes/rankingRoutes.ts:7`, sin `requireAuth`) | OK, sin nombres |
| Autorregistro de estudiante | `code/frontend/src/app/registro/page.tsx:29-41` → `POST /api/auth/signup-estudiante` (`code/backend/src/controllers/authController.ts:111-149`); valida curso + código de invitación contra `env.studentSignupCodes` (`code/backend/src/config/env.ts:4-11`), devuelve token y hace auto-login (`auth-context.tsx:44-49`) | OK |
| Login y enrutado por rol | `login/page.tsx:16-27` → `POST /api/auth/login` (`authController.ts:35-56`); redirección por `ROLE_HOME` (`lib/api.ts:7-11`) | OK |
| Guardia de rutas privadas | `components/RouteGuard.tsx:8-26` (cliente) + `requireAuth`/`requireRole` en backend (`middleware/auth.ts:20-43`) | OK; la autorización real es la del backend |
| QR del estudiante en pantalla | `app/estudiante/page.tsx:43-57`, `QRCodeSVG value={user.qrToken}` | Parcial (ver G-07) |
| Escaneo en portería | `app/porteria/page.tsx:58-93` (html5-qrcode, `facingMode: environment`) → `POST /api/attendance/scan` (`attendanceController.ts:18-58`), con lock de 1500 ms anti-doble-lectura (`porteria/page.tsx:52-55`) y tarjeta de resultado con color por estado (`:114-130`) | Parcial (ver G-10..G-13) |
| Historial del estudiante | `app/estudiante/page.tsx:79-113` ← `GET /api/attendance/me` (`attendanceController.ts:61-67`) | OK |
| Detalle individual de coordinación | `app/coordinacion/page.tsx:19-87` ← `GET /api/attendance?courseId=` (`attendanceController.ts:70-88`) | Parcial (ver G-15..G-18) |
| Cerrar sesión | `components/AppHeader.tsx:26-34` + `auth-context.tsx:56-61` | OK |
| Despliegue | Frontend export estático a Firebase (`next.config.ts:9-16`, `firebase.json`), backend en Render con CORS correcto hacia `speedgalileo-galileo.web.app` (verificado: header `access-control-allow-origin` correcto en vivo) | OK |

### Estado real de producción (verificado en vivo, 2026-09-11)

- `GET /api/courses` → 3 cursos: **Décimo, Noveno, Once**. Faltan 3 (grupo control).
- `GET /api/ranking` → `[]`. Cero registros de asistencia. Nunca se ha operado.

### Lo que el código no tiene (superficie total del API)

Ocho rutas, nada más: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/signup-estudiante`, `POST /api/attendance/scan`, `GET /api/attendance/me`, `GET /api/attendance`, `GET /api/ranking`, `GET /api/courses`. **No existe** ningún endpoint de: perfil/sesión (`/me`), cambio o recuperación de contraseña, listado de usuarios, CRUD de cursos, creación/edición/borrado manual de un registro de asistencia, exportación, métricas agregadas, ni línea base.

---

## 3. Gaps detectados

| ID | Gap | Eje | Severidad | Evidencia | Impacto en el piloto |
|---|---|---|---|---|---|
| G-01 | La clasificación de puntualidad usa la hora local del proceso; Render corre en UTC → 7:15 Bogotá se lee como 12:15 y devuelve "tarde"/0 pts para todos | 6 Datos | **Bloqueante** | `code/backend/src/utils/attendanceRules.ts:9` (`scannedAt.getHours()`), sin `TZ` en `.env.example` ni en `config/env.ts` | Todo el dataset del piloto sale con 0 pts. El fallo es silencioso: nadie se da cuenta hasta analizar los datos |
| G-02 | No existe registro de ausencia ni matrícula por curso; solo hay filas de quien escaneó | 6 Datos / 9 Cierre | **Bloqueante** | `models/AttendanceRecord.ts` (se crea solo en `attendanceController.ts:43`); `models/Course.ts:3-8` sin campo de matrícula | El indicador comprometido "% de llegadas puntuales por curso" (SOLICITUD §3) no tiene denominador → no se puede producir el informe final |
| G-03 | El ranking promedia puntos **sobre los registros existentes**, no sobre los estudiantes del curso | 5 Ranking | **Bloqueante** | `controllers/rankingController.ts:6-29` (`$avg: "$points"` agrupado por curso) | Un curso donde solo escanean los puntuales queda primero. La métrica premia el no-registro: invalida el experimento |
| G-04 | Solo 3 cursos en producción y el modelo no distingue intervención vs. control | 4 Admin / 9 Cierre | **Bloqueante** | `utils/seed.ts:10` (`["Noveno","Décimo","Once"]`); `models/Course.ts:3-8`; verificado en vivo en `/api/courses` | El diseño cuasi-experimental (3+3) no se puede montar; además `GET /api/ranking` publicaría a los cursos de control y contaminaría el grupo de comparación |
| G-05 | No hay alta masiva de estudiantes ni importación desde listado/CSV | 2 Onboarding | **Bloqueante** | `routes/authRoutes.ts` (solo alta individual); `utils/seed.ts:42-54` (un estudiante de ejemplo) | ~180 estudiantes tendrían que autorregistrarse uno por uno con correo y contraseña propios; cualquiera que no lo haga queda invisible para el sistema |
| G-06 | No hay generación ni impresión de carnets/QR en lote | 1 Perfil / 2 Onboarding | **Bloqueante** | Ausente; la dependencia `qrcode` está instalada en `code/backend/package.json:22` pero **no se usa en ningún archivo** (grep en `src/` sin resultados) | La landing promete "No necesitas celular" (`app/page.tsx:151`) pero el único canal de entrega del QR es la sesión web del propio estudiante. Sin carnet impreso el flujo de portería no arranca |
| G-07 | El estudiante no puede descargar ni imprimir su QR | 1 Perfil | Alto | `app/estudiante/page.tsx:43-57` (solo `<QRCodeSVG>` en pantalla, sin acción de descarga) | Depende de llevar el celular con sesión abierta, contradiciendo el diseño acordado |
| G-08 | No existe registro manual de respaldo en portería | 3 Portería | **Bloqueante** | `routes/attendanceRoutes.ts:7` (único write es `/scan` con `requireRole("profesor")`); `attendanceController.ts:41` fija la hora con `new Date()` | Si falla la cámara, el permiso del navegador, la red o el carnet de un estudiante, ese registro se pierde sin alternativa y el día queda incompleto |
| G-09 | No existe corrección/edición/anulación de un registro (excusa médica, permiso, escaneo erróneo) | 4 Admin | **Bloqueante** | Ausente: no hay `PATCH`/`DELETE` en `routes/attendanceRoutes.ts` | Coordinación no puede reflejar la realidad; el dato individual restringido que promete la carta se vuelve incorregible |
| G-10 | No hay carga de la línea base de 2 semanas desde planillas físicas | 9 Cierre | **Bloqueante** | Ausente; `recursos/planillas_extract.csv` es OCR inservible (288 filas, la mayoría vacías o basura: `"Haienting"`, `"Ohib"`); además `AttendanceRecord.scannedBy` es `required` (`models/AttendanceRecord.ts:13`), lo que impide insertar filas históricas | Sin línea base no hay comparación antes/después: el objetivo del proyecto de grado se cae |
| G-11 | No hay exportación de datos (CSV/Excel) | 4 Admin / 9 Cierre | Alto | Ausente; `app/coordinacion/page.tsx:62-79` solo renderiza una lista | El informe con evidencia cuantitativa prometido a la institución (SOLICITUD §5) habría que armarlo a mano desde la pantalla |
| G-12 | No se calcula ni se expone "minutos de clase perdidos" | 9 Cierre | Alto | Ausente en `controllers/` | Es uno de los dos indicadores comprometidos en SOLICITUD §3 |
| G-13 | El índice "un registro por día" está declarado explícitamente como **no único** | 6 Datos | Alto | `models/AttendanceRecord.ts:19-22` (`{ unique: false }`) frente al comentario de la línea 18. La deduplicación real es un read-then-write con carrera (`attendanceController.ts:32-39`) | Doble escaneo simultáneo o reintento de la cola offline puede duplicar registros. La tarea pendiente `code/Pendientes/prompt-logica-backupoffline.txt` **asume que ese índice único existe** — construir la cola sobre esta premisa falsa introduce duplicados |
| G-14 | No hay recuperación ni cambio de contraseña, ni reseteo por coordinación | 1 Perfil | Alto | `controllers/authController.ts` (solo `login`, `register`, `signupEstudiante`) | Un estudiante que olvide su contraseña queda fuera del sistema sin remedio: no puede mostrar su QR ni ver su historial |
| G-15 | No hay pantalla ni endpoint de perfil / sesión (`GET /api/auth/me`) | 1 Perfil | Alto | `lib/auth-context.tsx:7-19` lee el usuario **solo** de `localStorage`; nunca se revalida | El `qrToken`, el curso y el rol quedan congelados en el navegador. Si coordinación corrige el curso de un estudiante, su sesión sigue mostrando el anterior |
| G-16 | Coordinación no puede listar usuarios ni saber quién se registró | 4 Admin | Alto | Ausente: no hay ruta `GET /api/users` | Imposible saber cuántos estudiantes del curso están dados de alta → imposible validar el denominador de G-02 ni detectar cuentas falsas |
| G-17 | No hay CRUD de cursos | 4 Admin | Alto | `routes/courseRoutes.ts:7` (solo `GET`, público) | Crear los 3 cursos de control exige acceso a Atlas o re-correr el seed a mano |
| G-18 | No hay corrección de curso equivocado en un estudiante ya registrado | 2 Onboarding | Alto | Ausente | El código de invitación filtra al registrarse, pero si un estudiante usa el código de otro curso (se filtran entre compañeros) sus puntos se suman al curso equivocado, para siempre |
| G-19 | El ranking no tiene periodo: agrega **todo el historial** desde siempre | 5 Ranking | Alto | `controllers/rankingController.ts:6-29` sin filtro de fechas; la UI dice "Promedio de puntos de esta semana" (`app/page.tsx:243`) | El diseño del estudio exige ranking oculto en semanas 1–2 y publicado en 3–4 (`app/page.tsx:270-274`) — hoy no hay interruptor ni ventana temporal, y el rótulo de la UI es falso |
| G-20 | El frontend no maneja el 401 por expiración de JWT | 8 Robustez | Alto | `lib/api.ts:45-49` lanza `ApiError` sin cerrar sesión; token de 8 h (`config/env.ts:17`) | El profesor de portería puede quedar con sesión vencida a mitad de jornada y ver solo "Token inválido o expirado" en rojo por cada escaneo |
| G-21 | No hay indicador de envío en portería ni tolerancia al cold-start de Render | 8 Robustez | Alto | `app/porteria/page.tsx:36-56` (no hay estado `submitting`); tarea abierta en `code/Pendientes/prompt-logica-backupoffline.txt` | El primer escaneo del día tarda 30-50 s sin feedback; el profesor asume fallo y vuelve a escanear con la fila esperando |
| G-22 | El 409 "ya tiene registro hoy" se muestra como error rojo genérico | 3 Portería | Alto | `app/porteria/page.tsx:49-51` y `:108-112` (mismo estilo que un fallo real) | El profesor no distingue "ya estaba registrado, todo bien" de "falló el registro" y vuelve a intentar |
| G-23 | Sin rate limiting, sin `helmet`, sin manejador de errores centralizado | 7 Seguridad | Alto | `code/backend/src/app.ts:11-19` (solo `cors` y `express.json`); nada en `package.json` | `/api/auth/login` y `/signup-estudiante` son fuerza-brutables sobre una base con datos de menores; un throw no capturado devuelve HTML con stack |
| G-24 | No hay registro de consentimiento informado ni aviso de privacidad | 7 Seguridad | Alto | Ausente en `app/registro/page.tsx` y en `models/User.ts` | SOLICITUD §4.5 deja abierto si rectoría exige consentimiento de padres; si lo exige, no hay dónde registrarlo. Además el sistema recoge correo y contraseña, más de lo declarado en la carta ("nombre, curso, código de carnet y hora de llegada") |
| G-25 | Discrepancia NFC (carta) vs. QR (código) | 2 Onboarding / 9 Cierre | Alto | `docs/SOLICITUD_AUTORIZACION.md` §1 y §4.3 piden NFC; todo el código es QR (`app/porteria/page.tsx:4`, `app/estudiante/page.tsx:4`) | Lo autorizado por rectoría no es lo que se va a instalar. Requiere addendum antes de operar |
| G-26 | No hay noción de días no lectivos: fines de semana, festivos colombianos, jornadas especiales | 6 Datos | Medio | Ausente | El denominador de días del % de puntualidad y de "minutos perdidos" saldrá mal si no se excluyen |
| G-27 | `startOfDay` usa la zona del servidor para la ventana de "un registro por día" | 6 Datos | Medio | `controllers/attendanceController.ts:11-15` | En UTC el corte de día cae a las 7 p.m. de Bogotá; inconsistente con las fechas que el frontend muestra con `toLocaleDateString("es-CO")` (`app/estudiante/page.tsx:93`) |
| G-28 | El fetch de coordinación no tiene `.catch`: un fallo del API se ve idéntico a "no hay datos" | 8 Robustez | Medio | `app/coordinacion/page.tsx:30-42` (solo `.then`/`.finally`) | Coordinación puede creer que un curso no tiene registros cuando en realidad el backend está caído o dormido |
| G-29 | La UI de coordinación no usa los filtros de fecha que el backend ya soporta | 4 Admin | Medio | Backend acepta `from`/`to` (`attendanceController.ts:71-80`) pero `lib/api.ts:68-71` solo envía `courseId` | No se puede aislar la semana de línea base de la semana de intervención desde la interfaz |
| G-30 | El listado de asistencia no tiene paginación ni resumen | 4 Admin / 8 Robustez | Medio | `attendanceController.ts:82-87` (`find` sin `limit`); `app/coordinacion/page.tsx:62-79` | ~180 estudiantes × 10 días = ~1.800 tarjetas en una sola lista, sin totales ni porcentajes |
| G-31 | `register` no exige `courseId` cuando el rol es estudiante | 6 Datos | Medio | `controllers/authController.ts:58-64` (`courseId` opcional) | Se puede crear un estudiante sin curso; al escanearlo el backend responde 404 "sin curso asignado" (`attendanceController.ts:26-29`) y el profesor no entiende por qué |
| G-32 | `JWT_SECRET` tiene fallback silencioso a un valor conocido | 7 Seguridad | Medio | `code/backend/src/config/env.ts:16` | Si falta la variable en Render, el sistema arranca igual con un secreto público y los tokens se pueden falsificar |
| G-33 | Sin verificación de correo en el autorregistro | 2 Onboarding / 6 Datos | Medio | `controllers/authController.ts:111-149` | Con el código filtrado se pueden crear estudiantes ficticios que ensucian la matrícula y el denominador |
| G-34 | El QR es suplantable: nada ata el token a la persona en el momento del escaneo | 7 Seguridad | Medio | `authController.ts:82,145` (`randomUUID`, no adivinable, pero fotografiable); `app/porteria/page.tsx:124` muestra el nombre **después** de registrar | Un estudiante puede pasar la foto del QR de un compañero que va tarde. El nombre en pantalla es la única defensa y llega cuando el registro ya se creó |
| G-35 | Sin jornada: no hay apertura/cierre de día ni contador de escaneos | 3 Portería | Medio | Ausente en `app/porteria/page.tsx` | El profesor no sabe cuántos lleva ni puede cerrar el registro del día, y se puede escanear un domingo sin que nada lo impida |
| G-36 | `maximumScale: 1` bloquea el zoom del navegador | 8 Accesibilidad | Bajo | `app/layout.tsx:17-22` | Falla WCAG 1.4.4; relevante en una app que usan menores en celular |
| G-37 | El README de la raíz describe funcionalidad de `dev.sh` que ya no existe | 8 Robustez | Bajo | `README.md` describe generación de certificados HTTPS; `dev.sh:50` dice "por ahora todo corre en http plano" y `:69` advierte que la cámara no funcionará | Quien retome el proyecto pierde tiempo; la cámara no se puede probar desde celular siguiendo el README |
| G-38 | `code/frontend/README.md` sigue siendo el boilerplate de `create-next-app` | 9 Cierre | Bajo | `code/frontend/README.md:1-40` | La entrega comprometida incluye "el sistema con su código y documentación" (SOLICITUD §5) |
| G-39 | No hay estados de carga/vacío/error consistentes ni pruebas | 8 Robustez | Bajo | `app/coordinacion/page.tsx` sin estado de error; sin ningún archivo de test en el repo | Riesgo de regresiones al implementar las olas siguientes |

---

## 4. Detalle por gap (Bloqueantes y Altos)

### G-01 — Zona horaria (Bloqueante)
**Qué falta:** anclar toda la lógica horaria a `America/Bogota`, independiente de dónde corra el proceso.
**Dónde:** `code/backend/src/utils/attendanceRules.ts`, `code/backend/src/controllers/attendanceController.ts:11-15`, variables de entorno de Render.
**Mínimo viable:** poner `TZ=America/Bogota` en Render **y** dejar de depender de ello: convertir explícitamente con `Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", ... })` (o `date-fns-tz`) dentro de `computeAttendance` y de `startOfDay`. Añadir una prueba de humo que evalúe un `Date` de las 12:15 UTC y afirme `temprano`. Documentar la zona en `.env.example`.

### G-02 / G-03 — Ausentes, matrícula y métrica del ranking (Bloqueante)
**Qué falta:** el denominador. Hoy solo existe el numerador.
**Dónde:** `code/backend/src/models/Course.ts` (campos nuevos), un job o endpoint de cierre de día, `code/backend/src/controllers/rankingController.ts`.
**Mínimo viable:**
1. En `Course`, añadir `enrolled` (matrícula declarada) o, mejor, derivarla contando `User` con `role: "estudiante"` y ese curso — lo que exige antes G-05/G-16.
2. Un cierre de jornada (endpoint que coordinación dispara, o cron): para cada estudiante activo de un curso lectivo sin registro ese día, crear un `AttendanceRecord` con `status: "ausente"` y `points: 0` (implica ampliar `ATTENDANCE_STATUS` en `models/AttendanceRecord.ts:3` y relajar `scannedBy`, hoy `required`).
3. Cambiar el ranking a `% puntualidad = (registros con status temprano|a_tiempo) / (estudiantes × días lectivos del periodo)`, que es literalmente el indicador de la carta, y dejar el promedio de puntos como secundario.
4. Corregir el texto de `app/page.tsx:217-220`, que hoy afirma que se promedia "por estudiante" cuando se promedia por registro.
**Decisión previa del usuario:** ver §6, pregunta 3.

### G-04 — Seis cursos y separación intervención/control (Bloqueante)
**Qué falta:** tres cursos más y un campo de grupo.
**Dónde:** `code/backend/src/models/Course.ts`, `utils/seed.ts:10`, `controllers/rankingController.ts`.
**Mínimo viable:** añadir `group: "intervencion" | "control"` y `active: boolean` a `Course`; **filtrar el ranking público a `group: "intervencion"`** para no contaminar el control; ampliar el seed a 6 cursos con nombres reales (incluyendo letra de grupo si aplica: "Noveno A"/"Noveno B") y generar los códigos de invitación correspondientes en `STUDENT_SIGNUP_CODES`.

### G-05 / G-06 / G-07 — Alta masiva y entrega física del QR (Bloqueante)
**Qué falta:** un camino que no dependa de que cada menor cree su propia cuenta con correo.
**Dónde:** nuevo `POST /api/admin/students/import` (CSV: nombre, curso) y `GET /api/admin/courses/:id/carnets` (PDF/HTML imprimible); nueva pantalla `/coordinacion/estudiantes`; botón de descarga en `app/estudiante/page.tsx:43-57`.
**Mínimo viable:** importar por CSV creando usuarios con `qrToken` ya generado y contraseña temporal (o sin contraseña, si la cuenta web es opcional: el QR funciona sin que el estudiante inicie sesión nunca — `scanQr` solo busca por `qrToken`); usar la dependencia `qrcode` ya instalada para renderizar una hoja imprimible de N carnets por curso. El autorregistro actual queda como vía secundaria para vincular la cuenta web a un estudiante ya importado, no como vía de alta.
**Decisión previa del usuario:** ver §6, preguntas 1, 2 y 5.

### G-08 / G-09 — Respaldo manual y corrección de registros (Bloqueante)
**Qué falta:** poder escribir y arreglar asistencia sin la cámara.
**Dónde:** `code/backend/src/routes/attendanceRoutes.ts` (nuevas rutas `POST /manual`, `PATCH /:id`, `DELETE /:id` con `requireRole("coordinacion")`, y búsqueda de estudiante `GET /api/users?courseId=&q=`); en portería, un modo "buscar por nombre" junto al escáner.
**Mínimo viable:** `POST /api/attendance/manual` que acepte `studentId` + `scannedAt` explícito + `reason` y recalcule el estado con las mismas reglas; guardar `createdBy` y `reason` en el registro para trazabilidad (la carta exige que el dato individual sea auditable y no sancionatorio). Añadir un estado `justificado` para excusas médicas que no deban contar como tarde.

### G-10 — Línea base (Bloqueante)
**Qué falta:** meter dos semanas de planillas físicas al sistema.
**Dónde:** modelo (relajar `scannedBy` en `models/AttendanceRecord.ts:13`, añadir `source: "scan" | "planilla" | "manual"`), más un importador CSV reutilizando el de G-05.
**Mínimo viable:** definir el formato mínimo de la planilla (fecha, curso, nombre, hora) y digitarla a mano en una hoja de cálculo — el OCR de `recursos/planillas_extract.csv` no es recuperable. Importar con `source: "planilla"` para poder excluirla o incluirla en los reportes según convenga.
**Decisión previa del usuario:** ver §6, pregunta 4.

### G-11 / G-12 — Exportación y minutos perdidos (Alto)
**Qué falta:** el puente entre la base de datos y el informe académico.
**Dónde:** `GET /api/attendance/export.csv` y `GET /api/reports/summary?from=&to=` (coordinación), con botón en `app/coordinacion/page.tsx`.
**Mínimo viable:** el resumen devuelve por curso y periodo: matrícula, días lectivos, registros por estado, % puntualidad y minutos perdidos = `Σ max(0, scannedAt − hora de inicio de clase)` sobre los tardes. Con eso el informe a rectoría se genera en un clic en vez de a mano.

### G-13 — Índice único día+estudiante (Alto)
**Qué falta:** la garantía de idempotencia que la tarea offline ya da por hecha.
**Dónde:** `code/backend/src/models/AttendanceRecord.ts:19-22`.
**Mínimo viable:** añadir un campo derivado `day` (`YYYY-MM-DD` en hora de Bogotá, coherente con G-01) e indexar `{ student: 1, day: 1 }` con `unique: true`; en `scanQr` capturar el error de clave duplicada (E11000) y devolver el mismo 409 actual. **Debe hacerse antes** de implementar `code/Pendientes/prompt-logica-backupoffline.txt`.

### G-14 / G-15 / G-16 / G-17 / G-18 — Perfil y administración de usuarios (Alto)
**Qué falta:** todo el bloque de gestión de cuentas.
**Dónde:** `GET /api/auth/me`, `PATCH /api/auth/password`, `POST /api/admin/users/:id/reset-password`, `GET /api/users`, `PATCH /api/users/:id` (cambio de curso), CRUD de `/api/courses`; pantallas `/perfil` y `/coordinacion/usuarios`.
**Mínimo viable para el piloto:** no hace falta "olvidé mi contraseña" por correo — basta con que coordinación pueda resetear la contraseña de un estudiante y cambiarle el curso desde una tabla. `GET /api/auth/me` al montar `AuthProvider` (`lib/auth-context.tsx:37-42`) resuelve además la sesión rancia y da un punto natural para desloguear ante un 401 (G-20).

### G-19 — Periodo del ranking y fases del estudio (Alto)
**Qué falta:** ventana temporal e interruptor de publicación.
**Dónde:** `controllers/rankingController.ts` (aceptar `from`/`to` y filtrar por `Course.group`), más una bandera de configuración para las fases 1–2 (oculto) y 3–4 (publicado) que la propia landing ya anuncia en `app/page.tsx:270-274`.
**Mínimo viable:** parámetros `from`/`to` con default "semana en curso" (que es lo que el rótulo de `app/page.tsx:243` ya promete), y una variable de entorno `RANKING_PUBLIC_FROM` que devuelva `[]` antes de esa fecha.

### G-20 / G-21 / G-22 — Robustez de portería (Alto)
**Qué falta:** que el profesor nunca se quede sin saber qué pasó.
**Dónde:** `lib/api.ts:45-49` (interceptar 401 → `logout()`), `app/porteria/page.tsx:36-56` (estado `enviando`, feedback sonoro/vibración con `navigator.vibrate`, tratar 409 como aviso amarillo y no como error rojo).
**Mínimo viable:** estado visual de tres colores ya existe (`porteria/page.tsx:16-20`), solo hay que enrutar el 409 a un cuarto estilo neutro y añadir un spinner. Luego implementar la cola offline de `code/Pendientes/`, **después** de G-13.

### G-23 — Endurecimiento del backend (Alto)
**Qué falta:** defensas mínimas en un API público con datos de menores.
**Dónde:** `code/backend/src/app.ts:11-19`.
**Mínimo viable:** `helmet()`, `express-rate-limit` sobre `/api/auth/*` (p.ej. 10 intentos / 15 min por IP), un middleware de error final que siempre responda JSON, y quitar el fallback de `JWT_SECRET` (G-32) haciendo que el proceso falle al arrancar si no está definido.

### G-24 / G-25 — Consentimiento y NFC vs. QR (Alto)
**Qué falta:** alinear lo autorizado con lo que se va a operar.
**Dónde:** `docs/SOLICITUD_AUTORIZACION.md` (addendum), `app/registro/page.tsx` (casilla de aceptación + enlace a aviso de privacidad), `models/User.ts` (`consentAt`).
**Mínimo viable:** un addendum de una página a rectoría que (a) sustituya NFC por QR impreso justificando costo y equivalencia funcional, (b) declare que el sistema almacena además correo y contraseña para la consulta web del estudiante, y (c) recoja la respuesta institucional sobre consentimiento de padres. Es trabajo del dueño del proyecto, no del código.

---

## 5. Priorización propuesta

### Ola 1 — Bloqueantes, antes de encender el piloto

| # | Tarea | Esfuerzo | Depende de | Delegable |
|---|---|---|---|---|
| 1.1 | Anclar toda la lógica horaria a `America/Bogota` + prueba de humo (G-01, G-27) | S | — | Sí, subagente aislado |
| 1.2 | Índice único `{student, day}` + manejo de E11000 en `scanQr` (G-13) | S | 1.1 | Sí |
| 1.3 | `Course.group` (intervención/control) + `active`, seed de 6 cursos, filtro del ranking público (G-04) | S | Nombres reales de los 6 cursos | Requiere decisión del usuario, luego delegable |
| 1.4 | Importación CSV de estudiantes + `GET /api/users` + pantalla de usuarios en coordinación (G-05, G-16) | M | 1.3 | Requiere decidir el formato del listado, luego delegable |
| 1.5 | Generación de carnets QR imprimibles por curso (PDF/HTML) + descarga del QR individual (G-06, G-07) | M | 1.4 | Sí (la dependencia `qrcode` ya está instalada) |
| 1.6 | Estado `ausente` + cierre de jornada + ranking como % de puntualidad sobre matrícula (G-02, G-03) | L | 1.1, 1.3, 1.4 | Requiere decisión sobre la fórmula, luego delegable |
| 1.7 | Registro manual de respaldo + corrección/anulación de registros con motivo (G-08, G-09) | M | 1.4 | Sí |
| 1.8 | Importador de línea base con `source: "planilla"` (G-10) | M | 1.7 (comparten el modelo) | Depende de que exista la planilla digitada |
| 1.9 | Addendum QR vs. NFC + consentimiento a rectoría (G-25, G-24) | S | — | **No delegable** — es documento institucional |

### Ola 2 — Necesarios durante el piloto

| # | Tarea | Esfuerzo | Depende de | Delegable |
|---|---|---|---|---|
| 2.1 | Manejo global de 401 → logout + `GET /api/auth/me` (G-20, G-15) | S | — | Sí |
| 2.2 | Portería: indicador de envío, feedback sonoro/vibración, 409 como aviso y no error (G-21, G-22) | S | — | Sí |
| 2.3 | Cola offline del escaneo (`code/Pendientes/prompt-logica-backupoffline.txt`) (G-21) | M | 1.2 | Sí |
| 2.4 | `helmet` + rate limit en `/api/auth/*` + error handler JSON + `JWT_SECRET` obligatorio (G-23, G-32) | S | — | Sí |
| 2.5 | Reset de contraseña por coordinación + cambio de curso de un estudiante (G-14, G-18) | S | 1.4 | Sí |
| 2.6 | Filtros de fecha en la UI de coordinación + resumen por curso (G-29, G-30, G-28) | M | 1.6 | Sí |
| 2.7 | Calendario de días lectivos / festivos colombianos (G-26) | M | 1.6 | Requiere el calendario escolar real |
| 2.8 | Ranking por periodo + interruptor de publicación fases 1–2 / 3–4 (G-19) | S | 1.6 | Sí |

### Ola 3 — Deseables

| # | Tarea | Esfuerzo | Depende de | Delegable |
|---|---|---|---|---|
| 3.1 | Exportación CSV + endpoint de resumen con minutos perdidos (G-11, G-12) | M | 1.6, 2.7 | Sí — *subir a Ola 2 si el informe se escribe durante el piloto* |
| 3.2 | Foto del estudiante en la tarjeta de escaneo para evitar suplantación (G-34) | M | 1.4 | Requiere decisión sobre uso de fotos de menores |
| 3.3 | Cierre de jornada visible en portería + contador del día (G-35) | S | 1.6 | Sí |
| 3.4 | Verificación de correo o vinculación contra la lista importada (G-33) | M | 1.4 | Sí |
| 3.5 | Quitar `maximumScale: 1`, revisar foco y contraste (G-36) | S | — | Sí |
| 3.6 | README real del frontend + actualizar `README.md` raíz sobre `dev.sh`/HTTPS (G-37, G-38) | S | — | Sí |
| 3.7 | Pruebas de las reglas de puntualidad y del ranking (G-39) | M | 1.1, 1.6 | Sí |

> Nota sobre 3.1: está en Ola 3 solo porque el informe se escribe al final. Si el cronograma (`fechas.txt`: presustentaciones 13–16 de octubre) obliga a mostrar datos antes, súbela a Ola 2.

---

## 6. Decisiones pendientes del usuario

1. **QR o NFC.** La carta autorizada dice NFC; el sistema es QR. ¿Se emite un addendum a rectoría, o hay presupuesto y lector para carnets NFC? Toda la Ola 1.5 depende de esto.
2. **Quién imprime y entrega los carnets**, con qué material y en qué fecha. ¿Los imprime el colegio, o el estudiante autor? ¿Un carnet por estudiante o una hoja por curso que el director de grupo recorta?
3. **Fórmula oficial del ranking.** ¿% de llegadas puntuales sobre matrícula (lo que dice la carta) o promedio de puntos (lo que hay hoy)? ¿El ausente cuenta como 0 puntos, o se excluye del denominador de ese día? ¿Y la excusa médica? Sin esta definición no se puede cerrar G-02/G-03, que es el corazón del proyecto.
4. **Línea base.** El OCR de las planillas es inservible. ¿Quién digita las dos semanas previas y en qué formato? ¿Están completas las planillas de los 6 cursos o solo de algunos?
5. **Alta de estudiantes.** ¿Existe un listado oficial de los 6 cursos (nombre + curso) que el colegio pueda entregar en Excel? ¿Los estudiantes tienen correo institucional, o hay que generar cuentas sin correo real?
6. **Nombres reales de los 6 cursos** y cuáles son intervención y cuáles control. Hoy producción solo tiene "Noveno", "Décimo" y "Once".
7. **Consentimiento de padres.** SOLICITUD §4.5 deja la pregunta abierta a la institución. ¿Ya respondieron? Si exigen consentimiento, hay que registrarlo en el sistema y eso cambia el flujo de alta.
8. **Horario real.** ¿La hora de inicio de clase para calcular "minutos de clase perdidos" es 7:30 exactas? ¿El horario es el mismo los 5 días? ¿Hay jornadas especiales dentro de las 2 semanas del piloto?
9. **Calendario del piloto.** Fechas exactas de las semanas de línea base y de intervención, y qué días son no lectivos (festivos, izadas, salidas). Necesario para el denominador.
10. **Qué pasa después de las 7:30.** ¿El profesor sigue escaneando a los que llegan tarde, o portería cierra literalmente y esos estudiantes entran por otra vía sin registro? La respuesta define si "tarde" y "ausente" son distinguibles en los datos.
11. **Fotos de estudiantes en el escáner** (anti-suplantación): ¿es aceptable para la institución almacenar fotos de menores, o se descarta G-34?
