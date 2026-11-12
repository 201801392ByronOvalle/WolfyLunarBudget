# Implementation Plan: Gestión de Categorías

**Branch**: `feature/aowxkit-adoption` (feature `001-gestion-categorias`) | **Date**: 2026-11-12
(revisión final con decisiones D1–D4) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-gestion-categorias/spec.md` (aclaraciones Q1–Q5,
precisiones (a)/(b) de Q5, decisiones de la revisión del plan y correcciones de `/speckit-analyze`),
evaluado contra la Constitución v1.2.0 (2026-11-12).

## Summary

Completar la pantalla `/categorias` (consultar, crear, editar, activar/desactivar y ver un
diagnóstico de duplicados históricos) y ajustar Movimientos para que use solo categorías activas del
tipo correspondiente, permita conservar la categoría histórica y valide la pertenencia al usuario
configurado al crear, editar y desactivar. Enfoque: patrón de módulo de Movimientos
(`routes` + `controller`), reglas puras en `categorias.rules.ts`, usuario actual verificado al
arrancar (la API no arranca si es inválido), `src/app.ts` separado de `server.ts`, sin cambios de
esquema ni de datos, y Vitest con dobles de Prisma (sin Neon). Decisiones en
[research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5 (`strict`) sobre Node.js 22 (API) y Next.js 16 / React 19 (web).

**Primary Dependencies**: Express 4, Prisma ORM 6, Tailwind CSS 4, `lucide-react`. Nueva (dev,
aprobada D1): Vitest en `api/` y `web/`.

**Storage**: PostgreSQL en Neon vía Prisma. Sin cambios de esquema, migraciones ni datos. Única
lectura al arrancar: `usuario.findUnique`. Transacciones interactivas con `maxWait` 5000 ms y
`timeout` 10000 ms, configuradas en `lib/prisma.ts` (research R4, hallazgo H3).

**Testing**: Vitest; unitarias de reglas puras y del usuario actual, HTTP con `app.listen(0)` +
`fetch` nativo, Prisma sustituido por un doble en memoria. Los dobles no prueban concurrencia ni
aislamiento de PostgreSQL (excepción registrada).

**Target Platform**: API Node en Windows (desarrollo) y navegador moderno; móvil desde 360 px.

**Project Type**: aplicación web (monorepo sin workspaces: `api/` + `web/`).

**Performance Goals**: sin metas específicas; decenas de categorías por usuario. Sin consultas extra
por petición para el usuario actual.

**Constraints**: sin cambios de esquema (Const. IV); sin SQL manual; sin escrituras de agentes en
Neon; errores sin detalles internos (Const. VIII); alcance acotado (Const. X).

**Scale/Scope**: MVP de un usuario; 5 endpoints nuevos de Categorías (incluido el diagnóstico),
1 GET modificado, 3 endpoints de Movimientos modificados, cambio de arranque, 1 pantalla nueva y
2 componentes de Movimientos ajustados.

No quedan `NEEDS CLARIFICATION`.

## Constitution Check

*GATE: evaluado antes de Phase 0 y re-evaluado después de Phase 1 (revisión final).*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Stack y dependencias | Sin frameworks nuevos. Única dependencia nueva: Vitest (dev) en `api/` y `web/`, aprobada (D1) y justificada en R8. Sin supertest, jsdom ni librerías de mocks. Sin `any`. Estilos solo Tailwind con la paleta vigente. | ✅ |
| II. Separación por capas | Rutas en `categorias.routes.ts`; validación + Prisma en controladores. `categorias.rules.ts` (puro, usado por dos controladores), `lib/usuario-actual.ts` (usado por dos controladores y `server.ts`) y `src/app.ts` aprobados (D4). `server.ts` conserva arranque y escucha. Web: HTTP solo en `services/`, componentes en `components/categorias/`, tipos en `types/`. | ✅ con Complexity Tracking |
| III. Modelo y contrato | Columnas sin cambios; `Categoria` llega 1:1 a `web/types`. GET del catálogo sin campos de diagnóstico. Cambios de contrato declarados en la spec y en `contracts/` (incluidos desactivar movimiento y arranque). Sin borrado físico. | ✅ |
| IV. Esquema y migraciones | Sin cambios en `schema.prisma` ni `migrations/`. Ningún comando que escriba en la base. El arranque solo lee. | ✅ |
| V. Integridad | Validación en backend; pertenencia del registro en toda escritura (incluido desactivar movimiento) y de toda cuenta o categoría que se asigna; `$transaction` en toda lectura+escritura con `maxWait` 5000 / `timeout` 10000 ms; `Serializable` + reintentos acotados en crear/editar nombre o tipo de categoría, con límites documentados sin `UNIQUE`. La edición escribe solo los campos que cambian, así que las referencias que se conservan no forman parte de la escritura; si cambia `MOVTipo` o `CATId`, la categoría resultante cumple pertenencia, estado activo y correspondencia; no se corrigen referencias históricas. Conforme al texto de la Constitución v1.2.0 (C1 resuelto, ver abajo). Sin montos nuevos. | ✅ |
| VI. Reglas explícitas | Sin reglas financieras nuevas. Correspondencia de tipos, históricos y alcance aprobados en Q1–Q5 y en la revisión del plan. | ✅ |
| VII. Pruebas | Vitest (herramienta obligatoria desde v1.2.0; DA-03 cerrado) con pruebas de reglas, usuario actual (incluido `describirErrorArranque`), opciones de transacción, contratos HTTP, manejo de `P2034` y `P2028` simulados, regresión de Movimientos (incluida la desactivación) y transformación de `web/services`. Sin Neon. Excepción acotada para el comportamiento real de PostgreSQL y el cableado de salida de `server.ts`. | ✅ con excepción registrada |
| VIII. Credenciales y errores | Solo se documenta la clave `CURRENT_USER_ID`. Mensajes de arranque y de API sin valores de configuración ni cadena de conexión. El GET deja de devolver `error` crudo. Pruebas fuerzan `DATABASE_URL` a un host `.invalid`. | ✅ |
| IX. Criterios y documentación | Criterios Dado/Cuando/Entonces actualizados (US1-6, US5-10 a 12); contratos con ejemplos; se actualizarán roadmap, CHANGELOG, `docs/02-arquitectura/backend.md` y `frontend.md`, y README (variable, comportamiento de arranque y scripts `test`). | ✅ |
| X. Alcance | La ampliación (pertenencia en desactivar movimiento) quedó registrada en la spec. Los GET sin aislamiento multiusuario se registran como riesgo, sin refactorizar. Solo se tocan los archivos listados. | ✅ |

**Re-evaluación post-diseño**: las desviaciones justificadas siguen siendo las tres de estructura
aprobadas en D4 y la excepción de pruebas contra PostgreSQL real. Sin tensiones normativas abiertas
frente a la Constitución v1.2.0.

### Hallazgo C1: resuelto por la Constitución v1.2.0 (2026-11-12)

`/speckit-analyze` detectó que el texto del Principio V en la v1.1.0 exigía validar estado activo y
pertenencia de cuenta y categoría en **toda** escritura, lo que contradecía FR-022 y FR-026. Andrés
aprobó la enmienda **1.2.0 (MINOR)** del 2026-11-12, que establece:

- la pertenencia del propio registro se valida en toda escritura;
- el estado activo y la pertenencia de cuentas y categorías se validan cuando la operación asigna o
  modifica la referencia;
- conservar sin cambios una referencia histórica no es una nueva asignación, siempre que la
  escritura no incluya ese campo (las ediciones envían a Prisma solo los campos que cambian);
- en Movimientos, si cambia `MOVTipo` o `CATId`, la categoría resultante cumple pertenencia, estado
  activo y correspondencia de tipo;
- las referencias históricas inconsistentes no se corrigen ni normalizan automáticamente.

El diseño ya cumplía esa redacción: T054 (`updateMovimiento`) y T039 (`updateCategoria`) escriben
solo los campos que cambian, y T038/T051 lo verifican sobre los `data` del `update`. T054 deja de
estar bloqueada.

### Gobernanza: DA-03 cerrado

La enmienda 1.2.0 cerró DA-03: el Principio VII fija **Vitest** como herramienta obligatoria de
pruebas automatizadas en `api/` y `web/`. Cualquier otra herramienta o librería auxiliar de pruebas
requiere justificación según el Principio I. La decisión D1 de esta feature queda alineada con la
norma.

## Project Structure

### Documentation (this feature)

```text
specs/001-gestion-categorias/
├── spec.md
├── plan.md              # Este archivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── categorias.md    # Phase 1
│   └── movimientos.md   # Phase 1 (incluye arranque de la API)
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; no creado aquí)
```

### Source Code (repository root)

```text
api/
├── package.json                          # MOD: scripts "test" y "typecheck", devDependency vitest
├── vitest.config.ts                      # NUEVO: setupFiles, entorno node
├── tsconfig.test.json                    # NUEVO: noEmit, incluye tests; module ESNext +
│                                         #        moduleResolution Bundler (hallazgo M1)
├── src/
│   ├── app.ts                            # NUEVO: crea Express, middlewares y rutas; exporta app.
│   │                                     #        Sin listen ni verificación de usuario.
│   ├── server.ts                         # MOD: inicializarUsuarioActual(); ante error usa
│   │                                     #      describirErrorArranque → mensaje + exit(78/69/1);
│   │                                     #      si no, listen
│   ├── config/env.ts                     # MOD: currentUserIdRaw (CURRENT_USER_ID)
│   ├── lib/prisma.ts                     # MOD: transactionOptions { maxWait: 5000, timeout: 10000 }
│   │                                     #      exportadas como constante (hallazgo H3)
│   ├── lib/usuario-actual.ts             # NUEVO: parsear, inicializar (lectura), obtener,
│   │                                     #        describirErrorArranque; 2 clases de error
│   └── modules/
│       ├── categorias/
│       │   ├── categorias.rules.ts       # NUEVO: normalización, validación de campos,
│       │   │                             #        correspondencia, detectarDuplicados,
│       │   │                             #        cambiosCategoria/cambiosMovimiento (puro)
│       │   ├── categorias.controller.ts  # MOD: GET filtrado, GET duplicados, POST, PATCH,
│       │   │                             #      activar, desactivar; reintentos P2034 (privado);
│       │   │                             #      P2028 → 500 sin reintento
│       │   └── categorias.routes.ts      # MOD: rutas nuevas (fijas antes de /:id)
│       └── movimientos/
│           └── movimientos.controller.ts # MOD: usuario actual, USUId (D2), pertenencia en
│                                         #      crear/editar/desactivar, correspondencia,
│                                         #      FR-026, escritura solo de campos que cambian
│                                         #      (C1), $transaction, P2028 → 500
└── tests/
    ├── setup.ts                          # NUEVO: DATABASE_URL .invalid, CURRENT_USER_ID de prueba
    ├── support/
    │   ├── prisma-fake.ts                # NUEVO: Prisma en memoria (P2034/P2028 programables)
    │   └── servidor-prueba.ts            # NUEVO: inicializa usuario con el doble + listen(0)
    ├── unit/
    │   ├── categorias.rules.test.ts      # NUEVO
    │   ├── usuario-actual.test.ts        # NUEVO (incluye describirErrorArranque)
    │   └── prisma-opciones.test.ts       # NUEVO: valores de transactionOptions
    └── http/
        ├── app.test.ts                   # NUEVO: importar app no toca la base
        ├── categorias.consulta.test.ts   # NUEVO (US1)
        ├── categorias.creacion.test.ts   # NUEVO (US2)
        ├── categorias.edicion.test.ts    # NUEVO (US3)
        ├── categorias.estado.test.ts     # NUEVO (US4)
        └── movimientos.http.test.ts      # NUEVO (US5; incluye regresión de desactivar)

web/
├── package.json                          # MOD: script "test", devDependency vitest
├── vitest.config.ts                      # NUEVO: entorno node, alias @
├── types/
│   ├── categoria.ts                      # MOD: TipoCategoria, payloads, tipos del diagnóstico
│   └── movimiento.ts                     # MOD: CrearMovimientoPayload sin USUId
├── services/
│   └── categorias.service.ts             # MOD: crear/editar/activar/desactivar, diagnóstico,
│                                         #      filtrarCategoriasParaMovimiento (puro)
├── components/
│   ├── categorias/
│   │   ├── CategoriesTable.tsx           # NUEVO: lista, estados carga/vacío/error, estado en
│   │   │                                 #        texto, activar/desactivar, aviso de duplicados
│   │   └── CategoryForm.tsx              # NUEVO: crear y editar
│   └── movimientos/
│       ├── CreateMovementForm.tsx        # MOD: sin getUsuarios/USUId/bloqueo por usuario;
│       │                                 #      filtro por tipo; limpiar selección con aviso
│       └── MovementsTable.tsx            # MOD: getCategorias (todas del usuario); opciones con la
│                                         #      actual marcada; limpiar al cambiar tipo
├── app/categorias/page.tsx               # MOD: compone componentes; descripción sin
│                                         #      "transferencias"
└── tests/categorias.service.test.ts      # NUEVO

docs/                                     # MOD al cerrar: roadmap, CHANGELOG,
                                          # 02-arquitectura/backend.md y frontend.md
README.md                                 # MOD: CURRENT_USER_ID (solo nombre), arranque, scripts test
```

**Structure Decision**: se conserva la organización existente. Las pruebas viven en `api/tests/` y
`web/tests/`, fuera de `src/`, para no entrar en el build (`include` de `api/tsconfig.json`: `src` y
`prisma`); se comprueban con `npm run typecheck` (`tsconfig.test.json`). Las pruebas HTTP de
Categorías se dividen por historia para poder escribirse y revisarse por separado. Sin cambios:
`schema.prisma`, `migrations/`, `seed.ts`, demás módulos de la API, `services/api.ts`, dashboard y
layout. `lib/prisma.ts` solo cambia para fijar `transactionOptions` (sigue siendo la única instancia
de `PrismaClient`).

### Responsabilidades de los archivos nuevos de la API (D4)

| Archivo | Hace | No hace |
|---|---|---|
| `src/app.ts` | Crear la app, `cors`, `express.json`, `/`, `/health`, registrar las rutas. | `listen`, leer la base, verificar configuración. |
| `src/server.ts` | Llamar a `inicializarUsuarioActual()`; ante error, escribir el mensaje de `describirErrorArranque`, desconectar Prisma y salir con su código; si no, `listen`. | Definir rutas, decidir mensajes o códigos. |
| `lib/usuario-actual.ts` | Parsear `CURRENT_USER_ID`, verificar el usuario (una lectura), guardar y entregar el id, clasificar errores de configuración/conexión y traducirlos a mensaje + código de salida (`describirErrorArranque`, pura). | Leer otras variables, cachear otros datos, autenticar, llamar a `process.exit`. |
| `categorias.rules.ts` | Funciones puras de dominio de categorías. | Prisma, Express, reintentos, mensajes HTTP. |

## Estrategia de pruebas

1. **Unitarias (api)**: `categorias.rules.ts` y `usuario-actual.ts` con tablas de casos, incluidos
   históricos y errores de Prisma construidos en la prueba.
2. **HTTP (api)**: cada fila de [contracts/categorias.md](./contracts/categorias.md) y
   [contracts/movimientos.md](./contracts/movimientos.md): código, forma `{ success, message, data }`
   y estado del doble sin cambios cuando se espera rechazo (SC-002, SC-003, SC-010). Regresión de
   Movimientos: crear, editar y desactivar válidos.
3. **Manejo de errores de transacción simulados**: `P2034` (reintentos, máximo 3) y `P2028` (500
   sin reintento). Se describen como "manejo de error simulado", nunca como pruebas de concurrencia,
   aislamiento o tiempos de PostgreSQL.
4. **Unitarias (web)**: `filtrarCategoriasParaMovimiento`.
5. **Aislamiento**: `tests/setup.ts` fija `DATABASE_URL` a un host `.invalid` antes de cargar
   `env.ts`; `lib/prisma` mockeado en todas las pruebas que usan el doble (HTTP y
   `usuario-actual.test.ts`); importar `app.ts` no conecta ni verifica el usuario.
6. **Manual (excepción)**: A1–A5 (sin escrituras; A1 solo lee) y M1–M11 + regresión de
   [quickstart.md](./quickstart.md). **M1–M11 y la regresión se ejecutan exclusivamente en una base
   aislada** (decisión H2); nunca sobre la base Neon actual. No hay excepciones autorizadas.

## Riesgos y reversión

| ID | Riesgo | Mitigación / estado |
|---|---|---|
| R-1 | Con D3, cualquier error de `CURRENT_USER_ID` o de conexión al arrancar deja sin servicio a **toda** la API, incluidos módulos fuera de alcance. | Decisión aceptada (D3). Mensajes y códigos de salida distintos; README actualizado; configurar la variable antes de desplegar. |
| R-2 | La web antigua envía `USUId` del primer usuario; si no es el configurado, el POST responde 400. | Aceptado (D2). La web nueva no lo envía; el formulario muestra el mensaje. |
| R-3 | Unicidad sin `UNIQUE`: escrituras fuera de la API pueden crear duplicados; SSI puede abortar operaciones sin conflicto real (falsos positivos → reintentos o 409). | Documentado (R4). Reintentos acotados; diagnóstico de solo lectura para detectar duplicados. |
| R-4 | Cambio de tipo de categoría concurrente con un alta de movimiento con esa categoría (Read Committed) podría dejar un movimiento con tipo que no corresponde. | Abierto, probabilidad muy baja en MVP de un usuario; el diagnóstico de datos históricos lo trataría como inconsistencia histórica. |
| R-5 | Los dobles de Prisma pueden divergir del comportamiento real (filtros, `P2034`, `P2028`, SSI). | Excepción VII: casos M1–M11 en base aislada; automatizar al resolver DA-06. Sin base aislada, quedan pendientes. |
| R-6 | `GET /api/movimientos`, `/cuentas`, `/usuarios`, `/metas` y `/presupuestos` devuelven datos de todos los usuarios; los selectores de cuenta podrían ofrecer cuentas ajenas (que ahora se rechazan). | Riesgo residual fuera de alcance; sin refactorización. Pendiente para una spec de aislamiento multiusuario/autenticación. |
| R-7 | Editar un movimiento cuya cuenta está inactiva sigue fallando con 409 (la web reenvía `CUEId`). | Comportamiento actual, fuera de la spec; pendiente. |
| R-8 | El Dashboard muestra como "usuario conectado" al primero de la lista. | Fuera de alcance; pendiente. |
| R-9 | Formas Unicode distintas (NFC/NFD) del mismo nombre no se detectan como duplicado. | La spec no define normalización Unicode; documentado. |
| R-10 | Usuario borrado por fuera de la API después del arranque. | No hay endpoint que borre usuarios; las altas fallarían con 500 genérico hasta reiniciar (y al reiniciar, D3 impide arrancar). |
| R-11 | `npm run build` modifica `api/dist/` (versionado, DA-08). | No incluir esos cambios en los commits de la feature. |
| R-12 | Las operaciones que ahora usan `$transaction` (incluidas las de Movimientos) pueden responder 500 por `P2028` si Neon tarda en reanudar el compute más de `maxWait` (5 s) o la transacción supera `timeout` (10 s). | Valores elegidos con margen sobre la reanudación típica de Neon (research R4); `P2028` no se reintenta ni se confunde con `P2034`; caso M10 en base aislada. |
| R-13 | `transactionOptions` en el constructor de `PrismaClient` debe existir en la versión instalada de Prisma 6. | T014 lo verifica al implementar; si no existe, se pasan por llamada desde la constante exportada. |
| R-14 | `.specify/` está sin versionar y contiene `feature.json`, que la Constitución VIII prohíbe commitear. | Excluirlo de cualquier commit (T070, T075). |
| R-15 | ~~DA-03 resuelto (Vitest) pero aún listado como abierto en la constitución.~~ | **Cerrado** el 2026-11-12 por la Constitución v1.2.0. Se conserva el ID para no renumerar. |

**Reversión**: sin migraciones ni cambios de datos; revertir los commits de la feature restaura el
comportamiento anterior, incluido el arranque tolerante. Las categorías creadas son filas válidas del
esquema actual y no requieren limpieza. Despliegue: `CURRENT_USER_ID` → API → web; reversión: web →
API.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `modules/categorias/categorias.rules.ts` (funciones puras fuera del controlador) — aprobado D4 | Normalización, correspondencia y detección de cambios se usan en los controladores de categorías y de movimientos (criterio de Const. II) y deben probarse sin HTTP. | Duplicarlas en cada controlador arriesga divergencias en reglas aprobadas. |
| `lib/usuario-actual.ts` — aprobado D4 | La verificación del usuario la usan `server.ts` (arranque) y ambos controladores (obtener el id). | Repetirla en tres sitios; ponerla en `config/env.ts` mezclaría variables con Prisma. |
| `src/app.ts` separado de `server.ts` — aprobado D4 | `server.ts` llama a `listen` y ahora verifica el usuario contra la base; las pruebas HTTP necesitan la app sin puerto real ni Neon. | Condicionar `listen` con `require.main` es frágil bajo `ts-node-dev`; supertest no evita la verificación de arranque. |
| Excepción Principio VII: sin pruebas automáticas contra PostgreSQL real ni del cableado de salida de `server.ts` | No hay base aislada (DA-06) y las pruebas no pueden escribir en Neon. Afecta a filtros reales de Prisma, aislamiento `Serializable`/SSI, forma real del conflicto (`P2034`/`40001`), tiempos reales (`P2028`) y concurrencia; además, que `server.ts` invoque `process.exit` con 78/69/1 (su lógica de mensajes y códigos sí se prueba en `describirErrorArranque`). Cobertura manual: A1–A5 y M1–M11 en base aislada, con evidencia en el PR. Condición para automatizar: resolver DA-06. | Toda la lógica pura, el manejo de errores simulados y los contratos HTTP sí se automatizan. |
