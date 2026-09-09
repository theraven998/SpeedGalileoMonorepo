# SpeedGalileo

Sistema de registro de puntualidad con QR y ranking por curso — Gimnasio Galileo Galilei.

## Estructura

- `code/frontend` — Next.js (TypeScript + Tailwind), responsive, solo web (móvil/desktop, sin app nativa).
- `code/backend` — API Express + TypeScript + MongoDB (Mongoose) + JWT.
- `docs/` — idea de proyecto y documentación académica.

## Roles

- **Profesor**: escanea el QR del estudiante en portería (`/porteria`) con la cámara del dispositivo.
- **Coordinación**: ve el detalle individual de asistencia (`/coordinacion`) y registra usuarios (`/api/auth/register`).
- **Estudiante**: se autorregistra en `/registro` con el código de invitación de su curso, ve su historial y el ranking de los tres cursos (`/estudiante`).
- **Público**: landing (`/`) y tablero de ranking sin login (`/ranking`), nunca muestra nombres individuales.

El rol se detecta solo al iniciar sesión — el backend lo devuelve en la respuesta de `/api/auth/login` y el frontend redirige automáticamente a `/porteria`, `/coordinacion` o `/estudiante` según corresponda (ver `ROLE_HOME` en `code/frontend/src/lib/api.ts`).

### Autorregistro de estudiantes

`STUDENT_SIGNUP_CODES` en `code/backend/.env` define un código de invitación por curso (formato `Curso:CODIGO,Curso2:CODIGO2`). El estudiante elige su curso y escribe el código en `/registro`; sin el código correcto para ese curso, el backend rechaza el registro (403). Rota los códigos ahí cuando quieras invalidar los anteriores.

## Arranque local

### Opción rápida: lanzador único

```bash
./dev.sh
```

Levanta MongoDB en docker (crea el contenedor `speedgalileo-mongo` si no existe), instala dependencias si faltan, crea los `.env` desde los `.example` si no existen, y arranca backend + frontend juntos con logs prefijados `[backend]` / `[frontend]`. `Ctrl+C` detiene backend y frontend (MongoDB queda corriendo). Requiere `pnpm` y `docker`.

Primera vez, corre el seed en otra terminal mientras `dev.sh` está arriba:

```bash
cd code/backend && pnpm run seed
```

### Ver desde el celular (misma red WiFi)

`dev.sh` detecta la IP LAN de la máquina y genera un certificado HTTPS autofirmado (`certs/`, ignorado por git) válido para esa IP, porque la cámara del escáner QR solo funciona en un contexto seguro (https) — por http una IP de red no cuenta como seguro y el navegador bloquea la cámara. El frontend queda servido en `https://<tu-ip-lan>:3000` (Next hace el proxy interno de `/api/*` hacia el backend, sin CORS de por medio). `dev.sh` imprime la URL exacta al arrancar.

En el celular: abre esa URL, acepta el aviso de certificado no confiable (Avanzado → Continuar, una sola vez) y ya. Requiere estar en la misma red WiFi que la máquina y `openssl` instalado (viene por defecto en la mayoría de distros).

### Opción manual (dos terminales)

Requiere MongoDB corriendo (local o `docker run -d -p 27017:27017 mongo:7`).

```bash
# Backend
cd code/backend
cp .env.example .env
pnpm install
pnpm run seed   # crea cursos + usuarios de prueba (coordinación/profesor/estudiante)
pnpm run dev    # http://localhost:4000

# Frontend (otra terminal)
cd code/frontend
cp .env.local.example .env.local
pnpm install
pnpm run dev    # http://localhost:3000
```

Usuarios de prueba tras `pnpm run seed` (backend):

| Rol          | Email                          | Contraseña |
|--------------|---------------------------------|------------|
| Coordinación | coordinacion@galileo.edu.co     | cambiar123 |
| Profesor     | porteria@galileo.edu.co         | cambiar123 |
| Estudiante   | estudiante1@galileo.edu.co      | cambiar123 |

## Reglas de puntualidad (piloto)

Portería cierra 7:30. Antes de 7:20 → 3 pts. Entre 7:20 y 7:30 → 2 pts. Después de 7:30 → 0 pts.
Ver `code/backend/src/utils/attendanceRules.ts`.
# SpeedGalileoMonorepo
