# Changelog

Todos los cambios importantes de este proyecto serán documentados en este archivo.

El formato está basado en **Keep a Changelog** y el proyecto utiliza Versionado Semántico (Semantic Versioning).

---

## [Sin publicar] - Feature 001-gestion-categorias

Rama `feature/aowxkit-adoption`. Verificada con pruebas automatizadas que usan un doble de Prisma y,
el 2026-11-12, contra PostgreSQL 18.7 local aislado (casos A1–A5 y M1–M11 de
`specs/001-gestion-categorias/quickstart.md`; evidencia en `verificacion-manual.md`). M10 queda
verificado solo en parte y no se ha validado contra Neon. Contratos completos en
`specs/001-gestion-categorias/contracts/`.

### Agregado

#### API

- Variable `CURRENT_USER_ID`: usuario actual determinado por el servidor (no es autenticación).
- `GET /api/categorias/duplicados`: diagnóstico de solo lectura de duplicados históricos (mismo tipo
  y nombre normalizado), sin modificarlos.
- `POST /api/categorias`: alta con validación de nombre (1–50), tipo (`ingreso`, `gasto`, `ahorro`),
  color `#RRGGBB` e ícono, y unicidad por usuario, tipo y nombre normalizado, incluidas inactivas
  (409). Transacción `Serializable` con hasta 3 intentos ante `P2034`.
- `PATCH /api/categorias/:id`: edición que valida y escribe solo los campos que cambian; 409 si se
  cambia el tipo de una categoría con movimientos.
- `PATCH /api/categorias/:id/desactivar` y `/:id/activar`: cambio de estado sin borrar; 409 si ya
  tiene ese estado. Desactivar no modifica movimientos ni presupuestos.
- Pruebas automatizadas con Vitest en `api/` y `web/` (`npm test`) y `npm run typecheck` en `api/`.

#### Frontend

- Pantalla `/categorias`: lista con estados de carga, vacío y error; aviso de duplicados; crear,
  editar, activar y desactivar.
- Selectores de categoría de Movimientos filtrados por tipo, con la categoría histórica marcada en
  edición.

### Cambiado

#### Arranque de la API

- La API **no arranca** si `CURRENT_USER_ID` falta, no es un entero positivo o no corresponde a un
  usuario existente (código de salida 78), si no puede conectarse a la base para verificarlo (69) o
  ante otro error inesperado (1). Los mensajes no muestran valores de configuración.
- `server.ts` se separó en `app.ts` (aplicación Express) y `server.ts` (verificación y `listen`).
- Prisma usa `transactionOptions` globales: `maxWait` 5000 ms y `timeout` 10000 ms.

#### `GET /api/categorias`

- Devuelve solo las categorías del usuario actual (antes, de todos), activas e inactivas, ordenadas
  por nombre. Se agrega `message`; el 500 ya no incluye el campo `error` crudo.

#### `POST /api/movimientos`

- `USUId` pasa a ser **opcional**; si viene y difiere del usuario configurado → 400
  `"USUId no corresponde al usuario actual del servidor"`.
- Cuenta o categoría de otro usuario → 404 (antes se aceptaban).
- Categoría cuyo tipo no corresponde al del movimiento → 400
  `"La categoría no corresponde al tipo del movimiento"` (antes se aceptaba).
- Ya no responde 404 `"El usuario indicado no existe"`: el usuario se verifica al arrancar.

#### `PATCH /api/movimientos/:id`

- Movimiento de otro usuario → 404 `"El movimiento indicado no existe"` (antes se editaba).
- Reenviar una categoría inactiva sin cambiar tipo ni categoría → 200 y se conserva (antes 409).
- Si cambia el tipo o la categoría, la categoría resultante debe ser del usuario (404), estar activa
  (409, también si solo cambió el tipo) y corresponder al tipo (400).
- Cuenta nueva de otro usuario → 404.
- Solo se escriben los campos que cambian; `CATId` y `CUEId` sin cambios no se envían a Prisma.
- Sin cambios: reenviar la misma cuenta inactiva sigue respondiendo 409; `USUId` del cuerpo se
  ignora.

#### `PATCH /api/movimientos/:id/desactivar`

- Movimiento de otro usuario → 404 sin modificarlo (antes se desactivaba).

#### Transacciones

- Crear, editar y desactivar movimientos, y todas las escrituras de categorías, leen y escriben
  dentro de `prisma.$transaction`. Una transacción que no se inicia a tiempo o expira (`P2028`)
  responde **500** con el mensaje genérico de la operación, sin reintento.

#### Frontend

- `CreateMovementForm` ya no consulta `/api/usuarios` ni envía `USUId`.
- Se eliminó `getCategoriasActivas()` de `categorias.service.ts`.
- La lista de movimientos ya no produce desplazamiento horizontal en anchos móviles.

### Documentación

- Constitución v1.3.0 (Principio V: referencias asignadas o modificadas; Principio VII: Vitest;
  Principio X: política de commits locales).
- README, `docs/02-arquitectura/backend.md`, `frontend.md` y roadmap actualizados.

---

## [0.1.0] - 2026-07-29

### Agregado

#### Proyecto

- Creación del repositorio Wolfy Lunar Budget.
- Documentación inicial del proyecto.
- README principal.

#### Backend

- Configuración de Express.
- Configuración de TypeScript.
- Integración con Prisma.
- Integración con PostgreSQL (Neon).
- Variables de entorno.
- Seed inicial.
- Migración inicial.

#### Base de Datos

Se crearon los modelos:

- Usuario
- Cuenta
- Categoría
- Movimiento
- Meta
- PresupuestoMensual

#### API

Se crearon los endpoints iniciales:

- Usuarios
- Cuentas
- Categorías
- Movimientos
- Metas
- Presupuestos

#### Frontend

- Configuración de Next.js.
- Configuración de Tailwind.
- App Router.
- Layout principal.
- Sidebar.
- Dashboard inicial.
- Navegación entre módulos.
- Páginas base:

  - Dashboard
  - Movimientos
  - Cuentas
  - Categorías
  - Metas
  - Reportes

#### Documentación

Se creó el Developer Handbook:

- Onboarding.
- Visión del proyecto.
- Roadmap.
- Arquitectura Backend.
- Arquitectura Frontend.
- Arquitectura de Base de Datos.
- Convenciones de Desarrollo.
- Guía para Claude Code.
- Guía para ChatGPT.
- CONTRIBUTING.md.
- CHANGELOG.md.