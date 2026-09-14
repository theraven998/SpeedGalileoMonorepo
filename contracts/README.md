# Contratos del sistema — SpeedGalileo

Fuente única de verdad para backend y frontend. Si el código y este directorio
no coinciden, **gana este directorio**: se corrige el código, no el contrato.

Todo cambio de comportamiento observable (forma de una respuesta, un campo
nuevo, una regla de negocio) se edita aquí **primero** y después se implementa.

## Índice

| Archivo | Qué define |
|---|---|
| `00-dominio.md` | Reglas de negocio, calendario, métricas del piloto |
| `01-modelo-datos.md` | Colecciones de Mongo, campos e índices |
| `02-api.md` | Endpoints HTTP, request/response, códigos de error |
| `03-roles-permisos.md` | Matriz de autorización por ruta |
| `04-frontend.md` | Rutas, guards, estados de UI obligatorios |
| `types.ts` | Tipos TypeScript canónicos compartidos |

## Uso de `types.ts`

Es la definición canónica. Hoy backend y frontend son dos proyectos pnpm
independientes sin workspace, así que cada lado **replica** estos tipos:

- Backend: `code/backend/src/types/contracts.ts`
- Frontend: `code/frontend/src/lib/contracts.ts`

Ambas copias deben ser idénticas a `contracts/types.ts`. Migrar a un pnpm
workspace con un paquete `@speedgalileo/contracts` queda como deuda técnica
posterior al piloto.

## Convenciones transversales

- **Zona horaria**: toda regla de negocio se evalúa en `America/Bogota`.
  Mongo almacena UTC. Nunca se usa `getHours()`, `getDate()` ni
  `setHours()` sobre un `Date` para lógica de negocio.
- **Fecha lectiva**: el campo `day` es siempre `"YYYY-MM-DD"` en hora de
  Bogotá. Es la clave de agrupación diaria en todo el sistema.
- **Errores**: toda respuesta de error es `{ "error": "<mensaje en español>" }`.
- **Dinero de identidad**: ninguna respuesta pública (sin JWT) puede contener
  nombre, correo, `qrToken` ni `_id` de un estudiante.
