---

description: "Lista de tareas de implementación de la feature 001-gestion-categorias"
---

# Tasks: Gestión de Categorías

**Input**: Documentos de diseño en `specs/001-gestion-categorias/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/categorias.md](./contracts/categorias.md),
[contracts/movimientos.md](./contracts/movimientos.md), [quickstart.md](./quickstart.md),
Constitución v1.3.0.

**Revisión**: 2026-11-12, tras `/speckit-analyze` (correcciones C1, H1–H3, M1–M6, L1–L9),
sincronizada con la Constitución v1.2.0 (C1 y DA-03 resueltos) y con la v1.3.0 (política de
commits del Principio X).

**Tests**: OBLIGATORIAS (Constitución VII). Dentro de cada historia, las pruebas se escriben primero
y deben fallar antes de implementar.

**Organization**: fases revisables por separado: preparación → fundamentos → historias por prioridad
(US1, US2 = P1; US3, US4, US5 = P2) → integración, regresión y documentación.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivo distinto y sin dependencia de una tarea incompleta de su fase).
- **[Story]**: historia de usuario de la spec (US1 … US5).
- **[AUTO]**: verificación automatizada (no requiere base de datos).
- **[MANUAL-LECTURA]**: verificación manual que solo lee datos.
- **[MANUAL-AISLADA]**: verificación manual que escribe datos; **exclusivamente en una base aislada**
  (DA-06). Nunca sobre la base Neon actual, aunque la ejecute Andrés. No hay excepciones autorizadas.

## Reglas para quien implemente

- No ejecutar `prisma migrate`, `db push`, `db execute`, `db seed` ni escrituras manuales. No tocar
  `api/prisma/schema.prisma` ni `api/prisma/migrations/`.
- Instalar dependencias solo en T001/T002 (Vitest aprobado en D1); ninguna otra.
- Commits (Constitución X, v1.3.0): se PUEDEN crear commits locales de incrementos terminados y
  verificados en la rama de trabajo, en Conventional Commits en español (`tipo(alcance): …` con
  viñetas "Se implementó…/Se agregó…"), separando backend y frontend cuando sea coherente, con
  staging selectivo tras revisar `git status` y `git diff`, e informando los hashes cortos. Nunca
  incluir `.env*`, secretos, `.claude/settings.local.json`, `.specify/feature.json` ni `api/dist/`
  (DA-08, Constitución VIII). Sin push, reset destructivo, rebase ni cambio de rama sin petición
  explícita. Las verificaciones que requieren base aislada se registran como pendientes en el
  commit, sin afirmar que la integración está validada.
- Los dobles de Prisma verifican la lógica de la aplicación; **no** se presentan como pruebas de
  concurrencia, aislamiento, tiempos ni semántica de PostgreSQL (research R9).
- Mensajes de error sin valores de configuración, cadenas de conexión, objetos `error` ni stacks.
- Principio V (v1.2.0): las ediciones envían a Prisma solo los campos que cambian; una referencia
  conservada sin cambios no se incluye en `data` ni se revalida; la pertenencia del registro se
  valida siempre.

---

## Phase 1: Setup (preparación y configuración)

**Purpose**: infraestructura mínima de Vitest en `api/` y `web/` (D1, research R8).

- [X] T001 Agregar `vitest` a `devDependencies` (última estable compatible con Node 22 y TypeScript 5, fijada en `package-lock.json`) y los scripts `"test": "vitest run"` y `"typecheck": "tsc --noEmit -p tsconfig.test.json"` en api/package.json; ejecutar `npm install` en `api/`
- [X] T002 [P] Agregar `vitest` a `devDependencies` (misma versión que T001) y el script `"test": "vitest run"` en web/package.json; ejecutar `npm install` en `web/`
- [X] T003 Crear api/vitest.config.ts con `environment: "node"`, `include: ["tests/**/*.test.ts"]` y `setupFiles: ["tests/setup.ts"]` (depende de T001)
- [X] T004 [P] Crear api/tests/setup.ts que, antes de cualquier importación de `src/`, fije `process.env.DATABASE_URL` a un host inexistente del dominio reservado `.invalid` (sin credenciales) y `process.env.CURRENT_USER_ID = "1"`; comentar que `dotenv` no sobrescribe variables ya definidas
- [X] T005 [P] Crear api/tsconfig.test.json que extienda `./tsconfig.json` con `noEmit: true`, `module: "ESNext"`, `moduleResolution: "Bundler"` e `include: ["src", "prisma", "tests", "vitest.config.ts"]` (evita errores TS1479 al importar `vitest` desde archivos tratados como CommonJS; no afecta al build)
- [X] T006 Crear web/vitest.config.ts con `environment: "node"`, `include: ["tests/**/*.test.ts"]` y `resolve.alias` `@` → raíz de `web/` (sin plugins, sin jsdom) (depende de T002; no paralelizable con ella)
- [X] T007 [AUTO] Comprobar que Vitest arranca sin red ni base: `npx vitest run --passWithNoTests` en `api/` y en `web/`, y `npm run typecheck` en `api/` sin errores TS1479

**Checkpoint**: Vitest operativo en ambos paquetes, sin acceso posible a Neon desde las pruebas.

---

## Phase 2: Foundational (fundamentos compartidos — bloquea todas las historias)

**Purpose**: usuario actual (FR-013, D3), extracción de `app.ts` (D4), opciones de transacción (H3),
reglas puras compartidas (`categorias.rules.ts`), doble de Prisma y tipos web base.

**⚠️ CRITICAL**: ninguna historia empieza hasta cerrar esta fase.

### Pruebas de la fase (escribir primero)

- [X] T008 [P] Crear api/tests/support/prisma-fake.ts: doble en memoria con `usuario.findUnique`, `categoria.findMany/findUnique/create/update`, `cuenta.findUnique`, `movimiento.findUnique/count/create/update` y `$transaction(fn, opciones)`; filtros de igualdad simples; registro de llamadas, de escrituras y de los `data` enviados a cada `update`; registro de las `opciones` de cada `$transaction`; capacidad programable de lanzar en los N primeros intentos `Prisma.PrismaClientKnownRequestError` con `code: "P2034"` o con `code: "P2028"`, y errores de conexión (`PrismaClientInitializationError`, `P1001`) en `usuario.findUnique`. Comentario de cabecera: "No reproduce aislamiento, SSI, tiempos ni concurrencia de PostgreSQL"
- [X] T009 [P] Escribir api/tests/unit/categorias.rules.test.ts (debe fallar): `normalizarNombre` (" Comida " = "comida"; "Café" ≠ "Cafe"; espacios internos se conservan); validación de nombre ("nombre recortado no vacío, con un máximo de 50 caracteres"), tipo ("exactamente igual a `ingreso`, `gasto` o `ahorro`"), color (`null` o `/^#[0-9a-fA-F]{6}$/`; `""` → `null`) e ícono (`null` o texto recortado de 1 a 50 caracteres; `""` → `null`); `tipoCorresponde` para los tres pares, mayúsculas/minúsculas y un `CATTipo` histórico inválido (nunca corresponde); `detectarDuplicados` (sin grupos, un grupo, activas + inactivas, tipos distintos no agrupan, tipo con espacios/mayúsculas); `cambiosCategoria` y `cambiosMovimiento` (propiedad ausente ≠ cambio, mismo valor normalizado ≠ cambio, `" Comida "` vs `"Comida"` persistido ≠ cambio, `"comida"` vs `"Comida"` = cambio, `CATId: null` vs `null` persistido ≠ cambio, `CATId` distinto = cambio)
- [X] T010 Escribir api/tests/unit/usuario-actual.test.ts (debe fallar; depende de T008), declarando `vi.mock("../../src/lib/prisma", () => ({ prisma: doble }))` con el doble de T008: `parsearUsuarioActualId` con ausente, `""`, `"abc"`, `"0"`, `"-1"`, `"1.5"` → `ConfiguracionUsuarioActualError` (`FALTA` / `FORMATO_INVALIDO`) y `"7"` → 7; `inicializarUsuarioActual` con usuario inexistente → `USUARIO_INEXISTENTE`, con `PrismaClientInitializationError` o `P1001`/`P1002`/`P1008`/`P1017` simulados → `ConexionBaseDatosError`, con otro error → se propaga; `obtenerUsuarioActualId` antes de inicializar → error; `describirErrorArranque` → código 78 (configuración), 69 (conexión), 1 (otro) y mensajes que **no** contienen el valor configurado ni `DATABASE_URL`
- [X] T011 [P] Escribir api/tests/unit/prisma-opciones.test.ts (debe fallar): la constante de opciones de transacción exportada por `src/lib/prisma.ts` vale `{ maxWait: 5000, timeout: 10000 }` (importar el módulo no conecta; `DATABASE_URL` apunta a `.invalid`)

### Implementación de la fase

- [X] T012 [P] Agregar `currentUserIdRaw: process.env.CURRENT_USER_ID` (sin valor por omisión) en api/src/config/env.ts
- [X] T013 [P] Crear api/src/modules/categorias/categorias.rules.ts (solo funciones puras; sin Prisma ni Express): `TIPOS_CATEGORIA = ["ingreso", "gasto", "ahorro"]`, `LONGITUD_MAXIMA = 50`, `normalizarNombre(n) = n.trim().toLowerCase()`, validadores de nombre/tipo/color/ícono con las restricciones literales de data-model.md, normalización de color/ícono (`""` → `null`), `tipoCorresponde(CATTipo, MOVTipo) = CATTipo.trim().toUpperCase() === MOVTipo`, `detectarDuplicados(categorias)` (agrupa por tipo recortado en minúsculas + nombre normalizado; devuelve grupos `{ tipo, nombreNormalizado, categorias: [{ CATId, CATNombre, CATActiva }] }` con más de un elemento), `cambiosCategoria(existente, body)` y `cambiosMovimiento(existente, body)` según research R7 (hace pasar T009)
- [X] T014 [P] Modificar api/src/lib/prisma.ts: exportar `OPCIONES_TRANSACCION = { maxWait: 5000, timeout: 10000 }` y pasarla como `transactionOptions` al constructor de `PrismaClient` (sigue siendo la única instancia). Antes, comprobar en los tipos de `@prisma/client` instalado que el constructor acepta `transactionOptions`; si no, dejar la constante exportada y anotar en T032, T039, T046 y T053–T055 que se pasa por llamada (hace pasar T011; research R4, riesgo R-13)
- [X] T015 Crear api/src/lib/usuario-actual.ts (depende de T012): clases `ConfiguracionUsuarioActualError` (motivo `FALTA` | `FORMATO_INVALIDO` | `USUARIO_INEXISTENTE`) y `ConexionBaseDatosError`; `parsearUsuarioActualId(raw)`; `inicializarUsuarioActual()` con una sola lectura `prisma.usuario.findUnique({ where: { USUId }, select: { USUId: true } })` y clasificación de errores de research R3; `obtenerUsuarioActualId()`; `describirErrorArranque(error) → { mensaje, codigoSalida }` (pura) con los textos de contracts/movimientos.md §Arranque (hace pasar T010)
- [X] T016 Crear api/src/app.ts moviendo desde api/src/server.ts la creación de Express, `cors()`, `express.json()`, `GET /`, `GET /health` y el registro de las seis rutas; exportar `app`; sin `listen`, sin `inicializarUsuarioActual` y sin consultas a la base
- [X] T017 Reescribir api/src/server.ts (depende de T015, T016): `await inicializarUsuarioActual()`; ante error, `console.error(describirErrorArranque(e).mensaje)`, `await prisma.$disconnect()` y `process.exit(codigoSalida)`; si todo es correcto, `app.listen(env.port, …)` con el mismo mensaje actual
- [X] T018 Crear api/tests/support/servidor-prueba.ts (depende de T008, T015, T016): `iniciarServidorDePrueba()` que llama a `inicializarUsuarioActual()` (contra el doble mockeado por el archivo de prueba), abre `app.listen(0)` y devuelve `{ baseUrl, cerrar }`; documentar que cada archivo HTTP declara `vi.mock("../../src/lib/prisma", …)` con el doble
- [X] T019 [AUTO] Escribir y pasar api/tests/http/app.test.ts (depende de T018): importar `src/app.ts` no registra llamadas en el doble ni verifica el usuario; `GET /health` → 200; ruta inexistente → 404
- [X] T020 [P] Ampliar web/types/categoria.ts: `TIPOS_CATEGORIA`, `TipoCategoria`, `CategoriaResponse`, `CrearCategoriaPayload` (`CATNombre`, `CATTipo`, `CATColor?`, `CATIcono?`), `EditarCategoriaPayload = Partial<CrearCategoriaPayload>`, `GrupoDuplicadoCategoria`, `DuplicadosCategoriasResponse`; `Categoria` y `CategoriasResponse` sin campos nuevos
- [X] T021 [AUTO] Verificar en `api/`: `npm test` (T009, T010, T011, T019 en verde), `npm run typecheck` y `npx tsc --noEmit`

**Checkpoint**: arranque con D3, `app.ts` importable sin Neon, opciones de transacción fijadas,
reglas puras probadas.

---

## Phase 3: User Story 1 — Consultar mis categorías (Priority: P1) 🎯 MVP

**Goal**: ver las categorías del usuario configurado con nombre, tipo y estado, y el diagnóstico de
duplicados históricos (FR-001 a FR-003, FR-013, FR-025).

**Independent Test**: con datos del doble, `GET /api/categorias` devuelve solo las del usuario y
`GET /api/categorias/duplicados` identifica grupos sin escribir; en la UI se ven carga, vacío y error.

### Tests for User Story 1

- [X] T022 [P] [US1] Escribir api/tests/http/categorias.consulta.test.ts (debe fallar): `GET /api/categorias` → 200, `message` "Categorías obtenidas correctamente", solo `USUId` configurado, orden por `CATNombre` asc, activas e inactivas, **sin** propiedad `duplicadas` ni campos extra en cada `Categoria`; error del doble → 500 sin propiedad `error`; `GET /api/categorias/duplicados` → grupos de contracts/categorias.md, `[]` sin duplicados, solo categorías del usuario, **0 escrituras** en el doble (SC-009); orden de rutas: `GET /api/categorias/duplicados` llega al diagnóstico y no a un manejador `/:id`

### Implementation for User Story 1

- [X] T023 [US1] Modificar `getCategorias` en api/src/modules/categorias/categorias.controller.ts: `where: { USUId: obtenerUsuarioActualId() }`, `orderBy: { CATNombre: "asc" }`, respuesta `{ success, message, data }`, 500 `{ success: false, message: "Error al obtener categorías", data: null }` sin `error`
- [X] T024 [US1] Agregar `getDuplicadosCategorias` en api/src/modules/categorias/categorias.controller.ts: `findMany` del usuario + `detectarDuplicados`; solo lectura; mensaje "Diagnóstico de duplicados obtenido correctamente"
- [X] T025 [US1] En api/src/modules/categorias/categorias.routes.ts registrar `GET "/"` y `GET "/duplicados"`, con un comentario que fije el orden obligatorio: rutas fijas (`/duplicados`, `/:id/desactivar`, `/:id/activar`) antes de `/:id` (hace pasar T022)
- [X] T026 [P] [US1] Agregar `getDiagnosticoDuplicados()` (vía `apiGet`) en web/services/categorias.service.ts; `getCategorias` sin cambios de firma
- [X] T027 [US1] Crear web/components/categorias/CategoriesTable.tsx (depende de T026): indicador de carga (sin mensaje de vacío mientras carga), vacío que invita a crear, error comprensible con botón "Reintentar"; por fila nombre, tipo (Ingreso/Gasto/Ahorro; valor histórico tal cual), estado en texto "Activa"/"Inactiva", muestra de color si existe; aviso secundario con los grupos del diagnóstico y etiqueta "Duplicada" en sus filas (si el diagnóstico falla, la lista se muestra igual con aviso); colores de tipo verde/rojo/`sky`; usable a 360 px sin desplazamiento horizontal
- [X] T028 [US1] Componer `CategoriesTable` en web/app/categorias/page.tsx (componente cliente con señal de refresco, sin lógica de negocio ni HTTP directo) y cambiar la descripción para no mencionar "transferencias"
- [X] T029 [US1] [AUTO] Verificar: `npm test` en `api/` (T022 en verde); `npx tsc --noEmit` y `npm run lint` en `web/`

**Checkpoint**: la pantalla Categorías lista y diagnostica (solo lectura).

---

## Phase 4: User Story 2 — Crear una categoría (Priority: P1)

**Goal**: crear categorías válidas y únicas por usuario y tipo (FR-004 a FR-006, FR-015, FR-016).

**Independent Test**: `POST /api/categorias` cubre todas las filas de contracts/categorias.md §POST con
el doble; en la UI, crear una categoría la muestra activa en la lista.

### Tests for User Story 2

- [X] T030 [P] [US2] Escribir api/tests/http/categorias.creacion.test.ts (debe fallar): 201 con `CATActiva: true`, nombre recortado y `USUId` configurado aunque el cuerpo traiga otro (US2-1, US2-10); 400 por nombre vacío/solo espacios/> 50, tipo inválido, color inválido, ícono > 50 (US2-2 a US2-4); 409 duplicado activo y duplicado inactivo con sugerencia de reactivar, usando " comida " vs "Comida" (US2-5); mismo nombre con otro tipo → 201 (US2-6); 500 genérico sin detalles (US2-7); ningún rechazo escribe en el doble; se solicita `isolationLevel: Serializable`; bloque "manejo de errores de transacción **simulados** (no prueba PostgreSQL)": `P2034` 1 vez → 201 en el 2.º intento, 3 veces → 409 "Otra operación modificó las categorías al mismo tiempo; intenta de nuevo", `P2034` y luego duplicado presente → 409 de duplicado, `P2028` → 500 genérico con **un solo** intento

### Implementation for User Story 2

- [X] T031 [US2] Agregar en api/src/modules/categorias/categorias.controller.ts las funciones privadas `esErrorDeSerializacion(e)` — verdadero solo si `e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034"`, o si `e instanceof Prisma.PrismaClientUnknownRequestError` y `e.message` contiene `40001` o `could not serialize access`; `P2028` y cualquier otro error devuelven falso — y `ejecutarSerializableConReintentos(fn)` (hasta **3** intentos de `prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`, reejecutando la lectura en cada intento; `maxWait`/`timeout` según T014)
- [X] T032 [US2] Implementar `createCategoria` en api/src/modules/categorias/categorias.controller.ts: validar con `categorias.rules.ts`, ignorar `USUId`/`CATActiva` del cuerpo, buscar duplicados del usuario y tipo (activas e inactivas) y crear dentro de `ejecutarSerializableConReintentos`; `P2028` → 500 genérico sin reintento (registrar en consola solo el código); mensajes exactos de contracts/categorias.md
- [X] T033 [US2] Registrar `POST "/"` en api/src/modules/categorias/categorias.routes.ts (hace pasar T030)
- [X] T034 [P] [US2] Agregar `crearCategoria(payload)` (vía `apiPost`) en web/services/categorias.service.ts
- [X] T035 [US2] Crear web/components/categorias/CategoryForm.tsx en modo creación (depende de T034): nombre, tipo (`ingreso`/`gasto`/`ahorro`), color opcional, ícono opcional como texto; validación junto al campo; botón deshabilitado durante el envío (sin doble envío, US2-9); conserva los datos ante error; mensaje de confirmación al crear
- [X] T036 [US2] Integrar `CategoryForm` en web/app/categorias/page.tsx con refresco de `CategoriesTable` tras crear
- [X] T037 [US2] [AUTO] Verificar: `npm test` en `api/` (T030 en verde); `npx tsc --noEmit` y `npm run lint` en `web/`

**Checkpoint**: MVP (US1 + US2) funcional. US2-8 (ver la categoría solo en movimientos del tipo
correspondiente) se completa con US5.

---

## Phase 5: User Story 3 — Editar una categoría (Priority: P2)

**Goal**: editar nombre, color, ícono y tipo (si no tiene movimientos), validando y escribiendo solo
lo que cambia respecto de lo persistido (FR-005 a FR-007, FR-026).

**Independent Test**: `PATCH /api/categorias/:id` cubre contracts/categorias.md §PATCH y US3-1 a
US3-12 con el doble.

### Tests for User Story 3

- [ ] T038 [P] [US3] Escribir api/tests/http/categorias.edicion.test.ts (debe fallar): 200 cambiando nombre/color/ícono (US3-1); el nombre nuevo no cambia ningún movimiento del doble (US3-2); 400 por campo inválido que cambia (US3-3); 409 por nombre duplicado (US3-4) y aceptación de cambiar solo mayúsculas del propio nombre (no es duplicado de sí misma); 404 por inexistente u otro usuario sin revelar datos (US3-6); 409 por cambio de tipo con al menos un movimiento activo o desactivado (US3-7, mensaje "No se puede cambiar el tipo: la categoría tiene movimientos asociados"); 200 cambio de tipo sin movimientos (US3-8); duplicado histórico: solo color → 200 sin consultar unicidad (US3-9), cambio de nombre que sigue duplicando → 409 y que deja de duplicar → 200 (US3-10); `CATTipo` histórico inválido: editar nombre sin tipo → 200 conservando el tipo, cambiar tipo a valor inválido → 400 (US3-11); reenvío de nombre y tipo iguales (con espacios) + cambio de color → 200 sin evaluar unicidad ni tipo y con `data` del `update` que solo contiene `CATColor` (US3-12, C1); nombre histórico > 50 que no cambia → 200; `CATActiva`/`USUId`/`CATCreadoEn` del cuerpo se ignoran; `isolationLevel: Serializable` solo si cambian nombre o tipo; `P2034` simulado reintentado y `P2028` simulado → 500 sin reintento; `:id` no numérico o `"duplicados"` en `PATCH` → 400 "El id de la categoría es inválido"

### Implementation for User Story 3

- [ ] T039 [US3] Implementar `updateCategoria` en api/src/modules/categorias/categorias.controller.ts: cargar la categoría del usuario (404 si no), `cambiosCategoria`, validar solo campos que cambian, si cambia el tipo contar movimientos (`movimiento.count({ where: { CATId } })`, incluidos desactivados) → 409, unicidad excluyendo la propia dentro de `ejecutarSerializableConReintentos` cuando cambian nombre o tipo; `data` del `update` con **solo** los campos que cambian; `P2028` → 500 sin reintento
- [ ] T040 [US3] Registrar `PATCH "/:id"` en api/src/modules/categorias/categorias.routes.ts como **última** ruta (hace pasar T038)
- [ ] T041 [P] [US3] Agregar `editarCategoria(id, payload)` (vía `apiPatch`) en web/services/categorias.service.ts
- [ ] T042 [US3] Agregar modo edición en web/components/categorias/CategoryForm.tsx (depende de T041): precarga, botón cancelar que deja la categoría como estaba (US3-5) y, junto al campo de tipo, la advertencia **general** "Las categorías con movimientos asociados no permiten cambiar su tipo." visible antes de intentar el cambio, igual para todas las categorías (no depende de datos que el frontend no recibe); si el backend responde 409, mostrar su mensaje (US3-7, decisión H1)
- [ ] T043 [US3] Agregar la acción "Editar" en web/components/categorias/CategoriesTable.tsx y su orquestación en web/app/categorias/page.tsx
- [ ] T044 [US3] [AUTO] Verificar: `npm test` en `api/` (T038 en verde); `npx tsc --noEmit` y `npm run lint` en `web/`

**Checkpoint**: edición con FR-026 sobre datos históricos.

---

## Phase 6: User Story 4 — Activar y desactivar una categoría (Priority: P2)

**Goal**: cambiar el estado sin borrar, con confirmación y sin tocar movimientos ni presupuestos
(FR-008 a FR-012).

**Independent Test**: `PATCH /:id/desactivar` y `/:id/activar` cubren contracts/categorias.md con el
doble, incluida la idempotencia (409).

### Tests for User Story 4

- [ ] T045 [P] [US4] Escribir api/tests/http/categorias.estado.test.ts (debe fallar): desactivar → 200 `CATActiva: false` (US4-2); activar → 200 `CATActiva: true` (US4-6); repetir → 409 "La categoría ya se encuentra inactiva/activa" sin escrituras (US4-7); 404 por otro usuario o inexistente; desactivar con movimientos asociados → 200 y 0 escrituras sobre movimientos (US4-5, FR-010, SC-002); uso de `$transaction`; `P2028` simulado → 500; orden de rutas: `PATCH /api/categorias/5/desactivar` y `/5/activar` no llegan a `updateCategoria`

### Implementation for User Story 4

- [ ] T046 [US4] Implementar `desactivarCategoria` y `activarCategoria` en api/src/modules/categorias/categorias.controller.ts con lectura + actualización de `CATActiva` dentro de `prisma.$transaction` (aislamiento por omisión); sin tocar movimientos ni presupuestos; `P2028` → 500
- [ ] T047 [US4] Registrar `PATCH "/:id/desactivar"` y `PATCH "/:id/activar"` en api/src/modules/categorias/categorias.routes.ts **antes** de `PATCH "/:id"` (hace pasar T045)
- [ ] T048 [P] [US4] Agregar `desactivarCategoria(id)` y `activarCategoria(id)` (vía `apiPatch`) en web/services/categorias.service.ts
- [ ] T049 [US4] Agregar en web/components/categorias/CategoriesTable.tsx (depende de T048) las acciones "Desactivar" (con `window.confirm`, como `MovementsTable`; cancelar no cambia nada, US4-1/US4-3) y "Activar", con mensajes de confirmación y acciones deshabilitadas durante la operación
- [ ] T050 [US4] [AUTO] Verificar: `npm test` en `api/` (T045 en verde); `npx tsc --noEmit` y `npm run lint` en `web/`

**Checkpoint**: ciclo de vida completo de la categoría.

---

## Phase 7: User Story 5 — Usar categorías de forma coherente en Movimientos (Priority: P2)

**Goal**: correspondencia de tipos, categorías inactivas conservables, pertenencia al usuario en
crear, editar y desactivar, y `USUId` según D2 (FR-021 a FR-024, FR-026, ampliación de alcance).

**Independent Test**: `movimientos.http.test.ts` cubre contracts/movimientos.md y la regresión;
`categorias.service.test.ts` cubre el filtro de opciones del frontend.

### Tests for User Story 5

- [ ] T051 [P] [US5] Escribir api/tests/http/movimientos.http.test.ts (debe fallar): **POST** — categoría de otro tipo → 400 (US5-3), categoría de otro usuario → 404, cuenta de otro usuario → 404 (US5-7), categoría inactiva → 409, `USUId` distinto → 400 "USUId no corresponde al usuario actual del servidor", `USUId` igual → 201, sin `USUId` → 201 con el configurado; **PATCH** — conserva categoría inactiva reenviando todo → 200 con `data` del `update` **sin** `CATId` ni `CUEId` (US5-4, C1), asignar otra categoría inactiva → 409 (US5-5), sin categoría → 200 (US5-6), histórico con categoría que no corresponde sin cambiar tipo ni categoría → 200 sin corregir (US5-8), cambiar solo el tipo manteniendo categoría inactiva → 409, cambiar a categoría que no corresponde → 400, a categoría de otro usuario → 404, a cuenta de otro usuario → 404 (US5-9), movimiento de otro usuario → 404 (US5-10), `USUId` del cuerpo ignorado; **desactivar** — propio → 200, ya desactivado → 409, inexistente → 404, de otro usuario → 404 sin escrituras (US5-11); **errores simulados** — `P2028` en POST, PATCH y desactivar → 500 genérico sin reintento; **regresión** — crear, editar y desactivar válidos responden como antes (SC-006); en todos, uso de `$transaction` y 0 escrituras en rechazos
- [ ] T052 [P] [US5] Escribir web/tests/categorias.service.test.ts (debe fallar), con `import { describe, it, expect } from "vitest"`: `filtrarCategoriasParaMovimiento(categorias, tipoMovimiento, categoriaActualId?)` devuelve solo activas cuyo tipo corresponde (US5-1); en edición incluye la actual inactiva marcada "(inactiva)" (US5-4) o que no corresponde marcada "(no corresponde al tipo)" (US5-12); si el tipo cambió y la actual ya no corresponde, no la incluye; sin categorías del tipo → lista vacía

### Implementation for User Story 5

- [ ] T053 [US5] Modificar `createMovimiento` en api/src/modules/movimientos/movimientos.controller.ts: `USUId` opcional (400 si difiere de `obtenerUsuarioActualId()`), eliminar la búsqueda de usuario por cuerpo, validar cuenta (existe, del usuario → si no 404 "La cuenta indicada no existe", activa) y categoría (existe y del usuario → si no 404, activa → 409, `tipoCorresponde` → si no 400 "La categoría no corresponde al tipo del movimiento"), todo dentro de `prisma.$transaction`; `P2028` → 500 genérico sin reintento; crear con el `USUId` configurado
- [ ] T054 [US5] Modificar `updateMovimiento` en api/src/modules/movimientos/movimientos.controller.ts: movimiento inexistente o de otro usuario → 404; `cambiosMovimiento`; si cambia `CUEId` validar nueva cuenta (del usuario, activa); si cambia `MOVTipo` o `CATId` y la categoría resultante no es `null`, validar existencia, pertenencia (404), activa (409) y correspondencia con el tipo resultante (400); si no cambian, conservar la categoría histórica; construir `data` del `update` con **solo** los campos que cambian (`CATId` y `CUEId` sin cambios **no** se incluyen; Principio V de la Constitución v1.2.0); mantener la validación actual de cuenta inactiva reenviada (riesgo R-7); `USUId` del cuerpo ignorado; todo en `prisma.$transaction`; `P2028` → 500
- [ ] T055 [US5] Modificar `desactivarMovimiento` en api/src/modules/movimientos/movimientos.controller.ts: movimiento de otro usuario → 404 "El movimiento indicado no existe" sin escribir; resto igual; lectura + actualización en `prisma.$transaction`; `P2028` → 500 (hace pasar T051 junto con T053–T054)
- [ ] T056 [P] [US5] Quitar `USUId` de `CrearMovimientoPayload` en web/types/movimiento.ts
- [ ] T057 [US5] Agregar `filtrarCategoriasParaMovimiento` (función pura que reutiliza la correspondencia `CATTipo.trim().toUpperCase() === MOVTipo`) en web/services/categorias.service.ts (depende de T048 por compartir archivo; hace pasar T052)
- [ ] T058 [US5] Modificar web/components/movimientos/CreateMovementForm.tsx (depende de T056, T057): quitar `getUsuarios`, `usuarioId`, su mensaje y su bloqueo; cargar `getCategorias()` y mostrar `filtrarCategoriasParaMovimiento(…, form.tipo)`; al cambiar el tipo, limpiar la categoría que deja de corresponder y avisar (US5-2); mantener "Sin categoría"
- [ ] T059 [US5] Modificar web/components/movimientos/MovementsTable.tsx (depende de T057): cargar `getCategorias()` (todas las del usuario); en edición, opciones de `filtrarCategoriasParaMovimiento(…, formularioEdicion.tipo, movimiento.CATId)` con la marca correspondiente; al cambiar el tipo, limpiar la categoría que deja de corresponder y avisar; historial sin cambios
- [ ] T060 [US5] Buscar consumidores de `getCategoriasActivas` en `web/`; si no queda ninguno, eliminarla de web/services/categorias.service.ts
- [ ] T061 [US5] [AUTO] Verificar: `npm test` en `api/` (T051) y en `web/` (T052); `npx tsc --noEmit` y `npm run lint` en `web/`
- [ ] T062 [US5] [MANUAL-LECTURA] Compatibilidad del frontend con Movimientos (research R11), con API y web en local y **sin guardar nada**: en `/movimientos` el selector de nuevo movimiento muestra solo categorías activas del tipo elegido y se limpia con aviso al cambiar el tipo; si existe un movimiento con categoría inactiva, al abrir su edición aparece "(inactiva)" y se cancela sin guardar. Si no existe ese dato, marcar ese punto como "no verificable en lectura" y cubrirlo con M4 en T072

**Checkpoint**: todas las historias funcionales.

---

## Phase 8: Integración, regresión y documentación

**Purpose**: puertas de calidad, documentación (Constitución IX) y verificaciones manuales.

- [ ] T063 [AUTO] Puertas de `api/`: `npm test`, `npm run typecheck`, `npx tsc --noEmit`, `npm run build`; después, `git status` para confirmar que los cambios de `api/dist/` no se agregan a ningún commit (DA-08)
- [ ] T064 [AUTO] Puertas de `web/`: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`
- [ ] T065 [P] Actualizar README.md: clave `CURRENT_USER_ID` (solo el nombre), que no es autenticación, que la API no arranca si es inválida (códigos 78/69/1), y los scripts `test`/`typecheck`
- [ ] T066 [P] Actualizar docs/02-arquitectura/backend.md: `app.ts`/`server.ts`, `lib/usuario-actual.ts`, `lib/prisma.ts` (`maxWait` 5000 / `timeout` 10000 y por qué), `categorias.rules.ts`, endpoints nuevos y orden de rutas, transacciones `Serializable` con reintentos y sus límites sin `UNIQUE`, y que `P2028` no se trata como `P2034`
- [ ] T067 [P] Actualizar docs/02-arquitectura/frontend.md: `components/categorias/`, funciones nuevas de `categorias.service.ts`, filtro de categorías en Movimientos y advertencia general del cambio de tipo
- [ ] T068 [P] Actualizar docs/CHANGELOG.md con los cambios de contrato de contracts/categorias.md y contracts/movimientos.md (incluidos arranque, desactivar movimiento y respuesta 500 ante `P2028`)
- [ ] T069 [P] Actualizar docs/01-proyecto/roadmap.md: Categorías completada, ajustes de Movimientos; pendientes: excepción del Principio VII hasta resolver DA-06, casos manuales en base aislada si siguen sin ejecutarse y riesgos residuales aceptados R-4, R-6, R-7, R-8, R-9, R-10, R-12 y R-13 de plan.md
- [ ] T070 [AUTO] Revisiones estáticas del diff, **después** de T065–T069: ningún `fetch(` fuera de `web/services/`; `apiGet` en web/services/api.ts conserva `cache: "no-store"` (FR-019); ninguna respuesta con `error` crudo en api/src/modules/categorias/ ni movimientos/; sin `$queryRaw`/`$executeRaw`; `git diff --stat api/prisma` vacío; sin patrones de credenciales (`postgresql://`, `password=`, tokens) ni valores de `CURRENT_USER_ID`; `.specify/feature.json` y `api/dist/` fuera de lo preparado para commit
- [ ] T071 [MANUAL-LECTURA] Arranque A1–A5 de quickstart.md §2, ejecutado por Andrés (A1 solo lee de Neon; A2–A5 con cambios temporales en la configuración local, restaurados al terminar); evidencia sin valores de configuración. Cubre el cableado de salida de `server.ts` (excepción VII)
- [ ] T072 [MANUAL-AISLADA] Casos M1–M10 de quickstart.md §3 y regresión §4 (SC-006) **exclusivamente en una base aislada** preparada por Andrés (incluidos los duplicados históricos de M9); **nunca** sobre la base Neon actual. Registrar evidencia en el PR. En M7 anotar la forma del error observado (`P2034`, `40001` u otro) y, si no coincide con `esErrorDeSerializacion`, abrir una corrección; un `P2028` se registra aparte como tiempo agotado. Si no hay base aislada, la tarea queda **pendiente** y la excepción VII sigue abierta en el roadmap
- [ ] T073 [MANUAL-AISLADA] Validación de usabilidad SC-001 (caso M11 de quickstart.md) en la base aislada: cronometrar desde abrir `/categorias` hasta ver la confirmación de una categoría válida creada y anotar dificultades; es una observación de usabilidad, no una garantía de rendimiento
- [ ] T074 Revisar la matriz de trazabilidad de este archivo: cada criterio tiene una prueba en verde o evidencia manual (o figura como pendiente con motivo); marcar las tareas completadas
- [ ] T075 Preparar el resumen de entrega (Constitución IX): funcionalidad, archivos creados y modificados, decisiones, riesgos residuales, validaciones automáticas ejecutadas y manuales pendientes, y la lista de commits locales creados con su hash corto (Constitución X, v1.3.0); sin push y sin incluir `.specify/feature.json` ni `api/dist/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Phase 1; **bloquea** todas las historias.
- **US1 (Phase 3)** y **US2 (Phase 4)**: dependen de Phase 2. Comparten
  `categorias.controller.ts`, `categorias.routes.ts`, `categorias.service.ts` y `page.tsx`, así que
  se implementan en secuencia (US1 → US2); sus archivos de prueba sí son independientes.
- **US3 (Phase 5)**: depende de US2 (usa `ejecutarSerializableConReintentos` de T031 y `CategoryForm`).
- **US4 (Phase 6)**: depende de US1 (`CategoriesTable`) y comparte controlador y rutas con US3: hacer
  después de US3.
- **US5 (Phase 7)**: en la API depende solo de Phase 2 (`movimientos.controller.ts` es independiente),
  incluida T054. En la web comparte `categorias.service.ts` con
  US1–US4: T057 y T060 van después de T048.
- **Phase 8**: depende de todas las historias. T070 va después de T065–T069. T072 y T073 requieren
  una base aislada disponible.

### Dependencias críticas

1. T015 (`usuario-actual.ts`) → T017 (`server.ts`), T018 y todo controlador que use
   `obtenerUsuarioActualId()`.
2. T016 (`app.ts`) → T018/T019 → todas las pruebas HTTP.
3. T013 (`categorias.rules.ts`) → T023–T024, T032, T039, T053–T054.
4. T014 (`transactionOptions`) → toda tarea que use `$transaction` (T031, T032, T039, T046,
   T053–T055).
5. T031 (reintentos `Serializable`) → T032 y T039.
6. Orden de rutas: T025 fija el orden → T033 → T047 (fijas antes de `/:id`) → T040 (`/:id` última).
7. T057 → T058/T059.

### Within Each User Story

- Pruebas primero y fallando → controlador → rutas → servicio web → componentes → verificación.

### Parallel Opportunities (revisadas)

Cada [P] está en un archivo que ninguna otra tarea abierta de su fase modifica:

| Fase | Tareas [P] | Archivo de cada una |
|---|---|---|
| 1 | T002, T004, T005 | web/package.json, api/tests/setup.ts, api/tsconfig.test.json |
| 2 | T008, T009, T011, T012, T013, T014, T020 | prisma-fake.ts, categorias.rules.test.ts, prisma-opciones.test.ts, env.ts, categorias.rules.ts, lib/prisma.ts, web/types/categoria.ts |
| 3 | T022, T026 | categorias.consulta.test.ts, web/services/categorias.service.ts |
| 4 | T030, T034 | categorias.creacion.test.ts, web/services/categorias.service.ts |
| 5 | T038, T041 | categorias.edicion.test.ts, web/services/categorias.service.ts |
| 6 | T045, T048 | categorias.estado.test.ts, web/services/categorias.service.ts |
| 7 | T051, T052, T056 | movimientos.http.test.ts, web/tests/categorias.service.test.ts, web/types/movimiento.ts |
| 8 | T065–T069 | README.md, backend.md, frontend.md, CHANGELOG.md, roadmap.md |

T026, T034, T041 y T048 tocan el mismo archivo, pero en fases que se ejecutan en secuencia; no deben
ejecutarse a la vez si se adelantan historias. T006 y T070 dejaron de ser [P] (dependencias reales).

---

## Parallel Example: Phase 2 y User Story 5

```bash
# Phase 2, en paralelo:
Task: "Crear api/tests/support/prisma-fake.ts"                 # T008
Task: "Escribir api/tests/unit/categorias.rules.test.ts"       # T009
Task: "Escribir api/tests/unit/prisma-opciones.test.ts"        # T011
Task: "Crear api/src/modules/categorias/categorias.rules.ts"   # T013
Task: "Modificar api/src/lib/prisma.ts"                        # T014
Task: "Ampliar web/types/categoria.ts"                         # T020

# US5 en paralelo con US1–US4 (solo archivos propios):
Task: "Escribir api/tests/http/movimientos.http.test.ts"       # T051
Task: "Escribir web/tests/categorias.service.test.ts"          # T052
```

---

## Implementation Strategy

### MVP First (US1 + US2, ambas P1)

1. Phase 1 → Phase 2 (con D3, `app.ts` y opciones de transacción probados).
2. Phase 3 (US1) → validar consulta y diagnóstico.
3. Phase 4 (US2) → validar creación. **STOP**: revisión del MVP.

### Incremental Delivery

US3 → US4 → US5 → Phase 8. Cada fase termina con su tarea [AUTO] de
verificación y es revisable por separado. US5 cambia contratos de Movimientos: revisar con atención
antes de integrar.

---

## Traceability Matrix

| Criterio | Pruebas automatizadas | Implementación | Manual |
|---|---|---|---|
| US1-1 a US1-4, FR-001–FR-003 (lista, carga, vacío, error) | T022 | T023, T027, T028 | M8 (T072) |
| US1-5, FR-013 (solo usuario configurado) | T022 | T023 | — |
| US1-6, FR-025, SC-009 (diagnóstico) | T009, T022 | T013, T024, T027 | M9 (T072) |
| FR-013 / D3 (arranque) | T010, T019 | T015, T017 | A1–A5 (T071) |
| US2-1 a US2-7, US2-10, FR-004–FR-006 | T009, T030 | T013, T031–T033, T035 | M1, M2 (T072) |
| US2-8 (disponible en Movimientos por tipo) | T052 | T057–T058 | M1 (T072), T062 |
| US2-9, FR-016 (sin doble envío) | — (UI) | T035 | T072 |
| FR-014 (no es autenticación; errores sin detalles) | T010, T022 | T065 | T070 |
| FR-015 (confirmaciones y mensajes) | T030, T038, T045 (mensajes) | T035, T042, T049 | T072 |
| FR-017, SC-007 (360 px) | — (UI) | T027, T035 | M8 (T072) |
| FR-018 (mismos campos para Movimientos) | T022 | T023 | — |
| FR-019 (cambios visibles al recargar Movimientos) | T070 (`no-store` intacto) | T058, T059 (cargan `getCategorias()` en cada carga) | M1 (T072) |
| FR-020 (sin cambios de esquema ni datos) | T070 | — | — |
| Concurrencia sin `UNIQUE` | T030, T038 (solo `P2034` simulado) | T031 | M7 (T072) |
| H3 (`maxWait`/`timeout`, `P2028`) | T011, T030, T038, T045, T051 (simulado) | T014, T032, T039, T046, T053–T055 | M7, M10 (T072) |
| US3-1 a US3-12, FR-007, FR-026 (categorías) | T009, T038 | T039, T040, T042 | M6 (T072) |
| US3-7 (advertencia general, H1) | T038 (409 del backend) | T042 | M6 (T072) |
| US4-1 a US4-7, FR-008, FR-010, FR-011 (desactivar con movimientos), FR-012, SC-002 | T045 | T046, T047, T049 | M3 (T072) |
| FR-009, US4-4 (inactivas no se ofrecen ni aceptan en movimientos nuevos) | T051 (POST con categoría inactiva → 409), T052 (filtro solo activas) | T053, T057, T058 | M3 (T072) |
| FR-002 (estado en texto y muestra de color) | — (UI) | T027 | M8 (T072) |
| US5-1, US5-2, US5-12, FR-023 | T052 | T057–T059 | T062 |
| US5-3 a US5-10, FR-021, FR-022, FR-024, FR-026 (movimientos) | T009, T051 | T053, T054 | M4, M5 (T072) |
| C1 / Principio V v1.2.0 (escritura solo de campos que cambian) | T038, T051 (`data` del `update`) | T039, T054 | — |
| US5-11, FR-024 ampliado (desactivar) | T051 | T055 | §4 (T072) |
| SC-001 (usabilidad) | — | — | M11 (T073) |
| SC-003, SC-010 (rechazos sin escrituras) | T030, T038, T045, T051 | — | — |
| SC-004 (escrituras y consultas de Categorías aisladas) | T022, T030, T038, T045, T051 | — | — |
| SC-005 (estados de pantalla) | — (UI) | T027 | M8 (T072) |
| SC-006 (regresión Movimientos) | T051 | T053–T055 | §4 (T072) |
| SC-008 (movimientos nuevos con tipo correspondiente) | T051 | T053 | — |
| Constitución VII / VIII / IX | T063, T064, T070 | — | T075 |

---

## Riesgos residuales aceptados (de plan.md)

R-1 (D3 deja sin servicio a toda la API ante configuración inválida), R-2 (web antigua con `USUId`
distinto → 400), R-3 (unicidad solo de aplicación), R-4 (cambio de tipo concurrente con alta de
movimiento), R-5 (dobles ≠ PostgreSQL), R-6 (GET sin aislamiento multiusuario), R-7 (cuenta inactiva
reenviada), R-8 (Dashboard), R-9 (Unicode), R-10 (usuario borrado tras arrancar), R-11 (`api/dist/`),
R-12 (`P2028` por reanudación lenta de Neon), R-13 (`transactionOptions` según versión de Prisma),
R-14 (`.specify/feature.json`), R-15 (cerrado: DA-03 resuelto por la Constitución v1.2.0). Se registran en el
roadmap con T069; ninguno se corrige en esta feature.

---

## Notes

- [P] = archivo no modificado por otra tarea abierta de la fase y sin dependencia pendiente.
- [Story] traza la tarea a la historia de la spec; la matriz traza criterios a tareas.
- Verificar que las pruebas fallan antes de implementar.
- Commits locales por incrementos verificados según el Principio X (v1.3.0); push y operaciones
  destructivas solo con petición explícita de Andrés.
- Detenerse en cada checkpoint para revisar la fase.
