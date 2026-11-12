# Research: Gestión de Categorías

**Feature**: 001-gestion-categorias | **Fecha**: 2026-11-12 (revisión final del plan) |
**Plan**: [plan.md](./plan.md)

Fuentes revisadas (solo lectura): `api/src/server.ts`, `api/src/config/env.ts`, `api/src/lib/prisma.ts`,
`api/src/modules/categorias/*`, `api/src/modules/movimientos/*`, `api/prisma/schema.prisma`,
`api/package.json`, `api/tsconfig.json`, `web/services/*`, `web/types/*`,
`web/components/movimientos/*`, `web/app/categorias/page.tsx`, `web/app/movimientos/page.tsx`,
`web/package.json` y la Constitución (v1.1.0 al investigar; sincronizado con la v1.2.0 del
2026-11-12).

## Decisiones de Andrés incorporadas (2026-11-12)

| ID | Decisión | Dónde se aplica |
|---|---|---|
| D1 | **Aprobada**: Vitest como devDependency en `api/` y `web/`. | R8 |
| D2 | **Aprobada**: `POST /api/movimientos` rechaza con 400 un `USUId` distinto del configurado, con compatibilidad de transición. | R3, R6 |
| D3 | **Rechazada la propuesta tolerante**: la API no arranca si `CURRENT_USER_ID` falta, es inválido o referencia un usuario inexistente; distingue error de configuración y de conexión. | R3 |
| D4 | **Aprobada**: `src/app.ts` separado de `server.ts`; `categorias.rules.ts` y `lib/usuario-actual.ts` con responsabilidades acotadas. | R3, R7, R8 |
| Ajustes | Límites sin `UNIQUE` y reintentos ante `P2034`; quitar `duplicadas` del GET y usar diagnóstico independiente; pertenencia en `/desactivar` de movimientos; riesgos GET sin aislamiento; los dobles no prueban concurrencia; compatibilidad con Movimientos; importación de `app.ts` sin Neon. | R4, R5, R6, R9, R11 |

## Hallazgos del código actual que condicionan el diseño

- `GET /api/categorias` devuelve las categorías de todos los usuarios, sin `message`, y en el 500
  expone el objeto `error` crudo (incumple Constitución VIII).
- `POST /api/movimientos` exige `USUId` y no valida pertenencia de cuenta ni categoría.
  `PATCH /:id` no valida pertenencia y rechaza con 409 cualquier `CATId` inactivo presente en el
  cuerpo, aunque sea el que ya tenía (el frontend siempre reenvía `CATId` y `CUEId`).
  `PATCH /:id/desactivar` no valida pertenencia.
- Ninguna lectura+escritura de Movimientos usa `prisma.$transaction` (Constitución V lo exige para
  endpoints modificados).
- `CreateMovementForm` toma como usuario `getUsuarios().data[0].USUId` y bloquea el formulario si
  no hay usuario; ambos componentes de Movimientos cargan `getCategoriasActivas()` sin filtrar por
  tipo. En edición, si la categoría actual está inactiva no aparece entre las opciones, pero el
  estado conserva su id y el guardado la reenvía (hoy → 409).
- `api/src/server.ts` crea la app y llama a `app.listen` en el mismo módulo.
- `lib/prisma.ts` instancia `PrismaClient` al importarse; Prisma no abre conexión hasta la primera
  consulta.
- `config/env.ts` centraliza `dotenv`, que no sobrescribe variables ya definidas.
- No existe infraestructura de pruebas en `api/` ni en `web/`.

---

## R1. Endpoints REST necesarios

**Decision**: patrón de rutas de Movimientos en `api/src/modules/categorias/`:

| Método | Ruta | Uso | Estado |
|---|---|---|---|
| GET | `/api/categorias` | Lista del usuario actual | Existente, cambia |
| GET | `/api/categorias/duplicados` | Diagnóstico de duplicados históricos (solo lectura) | Nuevo |
| POST | `/api/categorias` | Crear | Nuevo |
| PATCH | `/api/categorias/:id` | Editar nombre, tipo, color, ícono | Nuevo |
| PATCH | `/api/categorias/:id/desactivar` | Desactivar | Nuevo |
| PATCH | `/api/categorias/:id/activar` | Activar | Nuevo |

Respuestas `{ success, message, data }`; errores 400 / 404 / 409 / 500 con `data: null`. Las rutas
fijas (`/duplicados`, `/:id/desactivar`, `/:id/activar`) se registran antes de `/:id`. Detalle en
[contracts/categorias.md](./contracts/categorias.md).

**Rationale**: patrón ya probado en el repositorio (Constitución II y X).

**Alternatives considered**: `PATCH /:id` con `CATActiva` (FR-007 prohíbe cambiar el estado por
edición); `DELETE` como desactivación (semántica de borrado físico, Constitución III); un único
`PATCH /:id/estado` (se aparta del patrón sin beneficio).

## R2. Adaptación del GET existente

**Decision**: `GET /api/categorias` filtra por `USUId = usuario actual`, ordena por `CATNombre` asc
y agrega `message`. Cada `Categoria` conserva exactamente sus campos. **No** se agrega ningún campo de
duplicados. El 500 deja de exponer `error`.

**Rationale**: FR-001, FR-013, FR-018 y FR-025. Los consumidores (`categorias.service.ts` →
`CreateMovementForm`, `MovementsTable`) solo leen `data`; `message` es aditivo y el filtro por usuario
es el cambio de comportamiento declarado.

**Alternatives considered**: incluir `duplicadas` o un indicador por categoría (descartado por
decisión de Andrés: mezcla diagnóstico con el catálogo que consume Movimientos).

## R3. Usuario actual: configuración, arranque y `USUId`

**Decision**:

1. **Clave**: `CURRENT_USER_ID` en `api/.env` (solo se documenta el nombre). `config/env.ts` expone
   el texto crudo (`currentUserIdRaw`); no hay valor por omisión.
2. **`lib/usuario-actual.ts`** (responsabilidades acotadas, sin estado global adicional):
   - `parsearUsuarioActualId(raw)`: función pura; devuelve un entero positivo o lanza
     `ConfiguracionUsuarioActualError` con motivo `FALTA` o `FORMATO_INVALIDO`.
   - `inicializarUsuarioActual()`: parsea y consulta `prisma.usuario.findUnique` (solo `USUId`).
     - Usuario inexistente → `ConfiguracionUsuarioActualError` (`USUARIO_INEXISTENTE`).
     - `Prisma.PrismaClientInitializationError`, o `PrismaClientKnownRequestError` con códigos de
       conexión (`P1001`, `P1002`, `P1008`, `P1017`) → `ConexionBaseDatosError`.
     - Cualquier otro error se propaga sin clasificar.
     - Si todo es correcto, guarda el id verificado en una variable del módulo.
   - `obtenerUsuarioActualId()`: devuelve el id verificado; si no se inicializó, lanza un error de
     programación que los controladores responden como 500 genérico.
   - `describirErrorArranque(error) → { mensaje, codigoSalida }`: función pura que traduce cada
     clase de error al mensaje y al código de salida siguientes. Vive aquí (y no en `server.ts`)
     para poder probarla sin arrancar el servidor (hallazgo M2).
3. **`server.ts`** (D3): antes de `listen`, `await inicializarUsuarioActual()`; ante error, usa
   `describirErrorArranque`, escribe el mensaje, desconecta Prisma y sale con el código indicado:
   - `ConfiguracionUsuarioActualError` → `console.error` con
     `"Error de configuración: CURRENT_USER_ID <falta | no es un entero positivo | no corresponde a
     un usuario existente>"` (sin el valor), `prisma.$disconnect()` y `process.exit(78)`
     (convención `EX_CONFIG`).
   - `ConexionBaseDatosError` → `"Error de conexión a la base de datos al verificar
     CURRENT_USER_ID"` (sin la cadena de conexión), `process.exit(69)` (`EX_UNAVAILABLE`).
   - Otro error → mensaje genérico de arranque y `process.exit(1)`.
4. **Por petición** no se vuelve a consultar el usuario: queda verificado al arrancar. Si alguien lo
   borrara por fuera de la API (no hay endpoint que lo haga), las consultas devolverían listas vacías
   y las altas fallarían por clave foránea con 500 genérico (riesgo residual).
5. **Categorías**: cualquier `USUId` del cuerpo se ignora.
6. **`POST /api/movimientos`** (D2): `USUId` opcional. Si viene y difiere → **400**
   `"USUId no corresponde al usuario actual del servidor"`; si coincide o se omite → se usa el
   configurado. Compatibilidad: la web actual (que envía el primer usuario de la lista) sigue
   funcionando mientras ese usuario sea el configurado; la web nueva deja de enviarlo.
7. **`PATCH /api/movimientos/:id`**: el `USUId` del cuerpo sigue ignorándose.

**Rationale**: FR-013, FR-014, FR-024 y D2/D3. Fallar al arrancar evita que la API sirva datos con un
usuario mal definido. Distinguir códigos de salida y mensajes permite saber si hay que corregir
`api/.env` o la conectividad con Neon. Verificar una sola vez elimina una consulta por petición.

**Alternatives considered**: arranque tolerante con 500 por operación (rechazado en D3); verificar
el usuario en cada petición (innecesario tras D3); ignorar el `USUId` distinto en el POST (rechazado
en D2); poner la verificación en `config/env.ts` (mezclaría lectura de variables con Prisma).

## R4. Validación de duplicados sin cambiar el esquema

**Decision**:

- Normalización en `categorias.rules.ts`: `normalizarNombre(n) = n.trim().toLowerCase()` (no se
  eliminan tildes ni se colapsan espacios internos).
- Al crear, y al editar si cambian `CATNombre` o `CATTipo` (FR-026), dentro de
  `prisma.$transaction(fn, { isolationLevel: Serializable })`: leer las categorías del usuario con el
  `CATTipo` resultante (activas e inactivas), excluir la propia en edición, comparar en memoria y
  escribir. Duplicado → **409** con el nombre de la existente (y sugerencia de reactivar si está
  inactiva).
- **Reintentos ante conflicto de serialización**: una función privada del controlador de categorías
  ejecuta la transacción completa hasta **3 intentos** cuando el error es `P2034` (o, de forma
  defensiva, cuando el error de Prisma trae SQLSTATE `40001`). Cada intento vuelve a leer: si la otra
  operación ya confirmó un nombre igual, el reintento responde el 409 de duplicado con su mensaje
  normal. Agotados los intentos → **409** `"Otra operación modificó las categorías al mismo tiempo;
  intenta de nuevo"`. Reintentar es seguro porque PostgreSQL revierte por completo la transacción
  fallida y no hay efectos fuera de ella.
- Activar y desactivar no cambian nombre ni tipo y no participan de la unicidad (las inactivas ya
  cuentan para duplicados).
- **Detección precisa del conflicto de serialización** (hallazgo M4): se considera conflicto
  únicamente (a) `Prisma.PrismaClientKnownRequestError` con `code === "P2034"`, o (b)
  `Prisma.PrismaClientUnknownRequestError` cuyo `message` contenga el SQLSTATE `40001` o el texto
  de PostgreSQL `could not serialize access`. Cualquier otro error (incluido `P2028`) no es un
  conflicto y no se reintenta. El caso M7 confirma qué forma aparece realmente.

**Tiempos de las transacciones interactivas (hallazgo H3)**:

- Valores por omisión de Prisma: `maxWait` = 2000 ms (espera para obtener la transacción de la base)
  y `timeout` = 5000 ms (duración máxima antes de cancelar y revertir). Si se superan, Prisma lanza
  `P2028` (error de la API de transacciones: transacción no iniciada a tiempo o expirada).
- Neon suspende el compute tras 5 minutos sin actividad (por omisión en el plan Free) y reanudarlo
  suele tardar unos cientos de milisegundos; la primera consulta tras la suspensión absorbe esa
  latencia. Con `maxWait` de 2 s, una reanudación lenta más la espera del pool puede producir
  `P2028` en operaciones que hoy, sin transacción, funcionan (riesgo de regresión SC-006).
- **Decision**: `maxWait: 5000` y `timeout: 10000` ms, configurados una sola vez en
  `api/src/lib/prisma.ts` mediante `transactionOptions` del constructor de `PrismaClient` (disponible
  desde Prisma 5.10 según sus notas de versión; se verifica contra la versión instalada al
  implementar y, si no estuviera disponible, se pasan por llamada desde una constante exportada en
  el mismo archivo). El aislamiento `Serializable` se sigue pidiendo por llamada solo donde aplica.
  - `maxWait` 5 s: cubre con margen una reanudación de Neon (cientos de ms) más la espera del pool,
    sin dejar al usuario esperando indefinidamente.
  - `timeout` 10 s: cada transacción hace de 2 a 4 consultas cortas; 10 s es holgado para latencias
    de red altas y sigue acotando cuánto tiempo se retienen bloqueos y predicados de SSI.
  - Peor caso de una petición con reintentos: los reintentos solo ocurren ante conflictos de
    serialización, que fallan rápido; un `P2028` no se reintenta, así que la espera máxima de una
    petición sin conflicto es ~15 s.
- **Manejo de `P2028`**: no es un conflicto de serialización y **no** se trata como `P2034`. No se
  reintenta; se responde **500** con el mensaje genérico de la operación (sin detalles) y se registra
  en consola solo el código `P2028`. Aplica a Categorías y a Movimientos.
- **Alternatives considered**: mantener los valores por omisión (riesgo de `P2028` tras cada
  suspensión de Neon); valores mucho mayores, como 30 s (retienen bloqueos y dejan colgada la UI);
  reintentar ante `P2028` (podría duplicar la espera sin resolver una base caída); responder 503
  (código nuevo en el contrato; se prefiere el 500 genérico ya declarado).

Fuentes: documentación de transacciones de Prisma (valores por omisión de `maxWait`/`timeout`,
`transactionOptions`) y documentación de Neon sobre scale to zero y latencia de conexión.

**Límites documentados (sin restricción `UNIQUE`)**:

1. La garantía es **solo de la aplicación**. PostgreSQL detecta el conflicto únicamente entre
   transacciones que se ejecutan con aislamiento `Serializable`. Las escrituras hechas fuera de esas
   transacciones (seed, Prisma Studio, SQL manual, otro código futuro con otro aislamiento) pueden
   crear duplicados sin que nada lo impida.
2. Sin un índice sobre (`USUId`, `CATTipo`), los bloqueos de predicado de PostgreSQL pueden ser más
   amplios y abortar transacciones que en realidad no chocan (falsos positivos). Eso solo provoca
   reintentos o un 409 de concurrencia, nunca datos inconsistentes.
3. Los duplicados históricos existentes no se previenen ni se corrigen; solo se diagnostican (R5).
4. Cambio de tipo de una categoría vs. alta simultánea de un movimiento con esa categoría: la
   creación de movimientos usa `$transaction` con el aislamiento por omisión (Read Committed), por lo
   que SSI no detecta ese cruce. En teoría podría quedar un movimiento cuyo tipo no corresponde. Exige
   dos operaciones concurrentes sobre una categoría sin movimientos en un MVP de un usuario; se
   registra como riesgo residual en lugar de extender `Serializable` y reintentos a Movimientos.
5. La traducción exacta del fallo de serialización a `P2034` depende de la versión de Prisma; se
   confirma en el caso manual M7 contra una base aislada.

**Rationale**: FR-006, FR-020, Constitución IV/V. Sin SQL manual no se puede filtrar con `trim()` en
la consulta, y el catálogo por usuario y tipo es pequeño.

**Alternatives considered**: `mode: "insensitive"` (no recorta espacios históricos); índice único
funcional (cambio de esquema prohibido y fallaría con duplicados históricos); `SELECT … FOR UPDATE`
(SQL manual); responder 409 sin reintentar (peor experiencia: el usuario vería un error de
concurrencia en vez del mensaje de duplicado real).

## R5. Diagnóstico de duplicados históricos (solo lectura, independiente)

**Decision**: endpoint `GET /api/categorias/duplicados`, separado del catálogo:

- Lee con `findMany` las categorías del usuario actual (activas e inactivas). No escribe nada.
- Función pura `detectarDuplicados(categorias)` en `categorias.rules.ts`: agrupa por
  (`CATTipo` recortado en minúsculas, `normalizarNombre(CATNombre)`) y devuelve los grupos con más de
  un elemento.
- Respuesta: `data: [{ tipo, nombreNormalizado, categorias: [{ CATId, CATNombre, CATActiva }] }]`;
  `[]` si no hay duplicados.
- Solo lo consume la pantalla de Categorías, en una llamada aparte. Si falla, la lista se muestra
  igual con un aviso secundario. Movimientos no lo usa.

**Rationale**: FR-025, US1-6 y SC-009: identifica sin modificar, con la regla en un solo sitio y sin
alterar el contrato que consume Movimientos.

**Alternatives considered**: campo en el GET (descartado por Andrés); script de consola de solo
lectura (el usuario no lo vería en la pantalla y requeriría ejecutarlo contra Neon a mano); vista en
la base de datos (cambio de esquema).

## R6. Cambios mínimos en Movimientos

**Decision** (`movimientos.controller.ts`, todo dentro de `prisma.$transaction`):

- **Crear**: `USUId` según R3; cuenta existente, del usuario (si no → 404 "La cuenta indicada no
  existe") y activa; categoría (si se envía) existente, del usuario (404), activa (409) y
  correspondiente a `MOVTipo` (400 `"La categoría no corresponde al tipo del movimiento"`).
- **Editar**: movimiento inexistente o de otro usuario → 404. Según R7:
  - `CUEId` cambia → la nueva cuenta debe existir, ser del usuario y estar activa.
  - `MOVTipo` o `CATId` cambian y la categoría resultante no es `null` → debe existir, ser del
    usuario, estar activa y corresponder al tipo resultante (también si solo cambió el tipo).
  - Ninguno cambia → se conserva la categoría histórica aunque esté inactiva o no corresponda.
  - **Escritura (C1)**: `data` del `update` incluye solo los campos que cambian; `CATId` y `CUEId`
    sin cambios no se envían a Prisma, de modo que la operación no escribe referencias que no ha
    validado.
- **Desactivar** (ampliación de alcance): movimiento inexistente **o de otro usuario** → 404
  `"El movimiento indicado no existe"`; el resto igual que hoy (409 si ya está desactivado).
- `tipoCorresponde(CATTipo, MOVTipo) = CATTipo.trim().toUpperCase() === MOVTipo`, en
  `categorias.rules.ts`.
- **Sin cambios**: `GET /api/movimientos`. La cuenta inactiva que se reenvía sin cambio sigue
  rechazándose como hoy (no lo cubre la spec).

**Rationale**: FR-021 a FR-024, FR-026 y la ampliación de alcance de la revisión del plan.

**Alternatives considered**: servicio compartido de movimientos (capa sin necesidad); validar solo en
el frontend (Constitución V exige backend).

## R7. Comparación de valores actuales vs. nuevos normalizados

**Decision**: funciones puras en `categorias.rules.ts`, sin Prisma:

- `cambiosCategoria(existente, body)` → `{ nombre, tipo, color, icono }`. Un campo cambia solo si
  viene en el cuerpo **y** su valor normalizado (nombre recortado; color/ícono recortado y `""` →
  `null`) difiere del persistido. FR-005 y la unicidad se aplican solo a lo que cambia.
- `cambiosMovimiento(existente, body)` → `{ tipo, categoria, cuenta }`. `CATId` se compara como
  `body.CATId ?? null` frente a `existente.CATId`; `undefined` nunca es cambio.

**Responsabilidad de `categorias.rules.ts`** (D4): solo funciones puras de dominio de categorías
(normalización, validación de campos, correspondencia, detección de duplicados y de cambios). No
accede a Prisma, no conoce Express y no contiene reglas de Movimientos ajenas a la categoría.

**Rationale**: FR-026 exige comparar contra lo persistido. Al ser puras, se prueban exhaustivamente
sin base de datos.

**Alternatives considered**: comparar inline en cada controlador (duplicación); que el frontend envíe
solo lo modificado (no protege a otros clientes).

## R8. Infraestructura mínima de pruebas (D1; DA-03 cerrado)

**Decision**: **Vitest** como única dependencia nueva, en `devDependencies` de `api/` y `web/`.

**Estado normativo**: desde la Constitución v1.2.0 (2026-11-12), el Principio VII **exige** Vitest
para las pruebas automatizadas de `api/` y `web/` y DA-03 está cerrado. Ya no es una herramienta
pendiente de elección: esta feature crea la configuración mínima que la norma pide. La comparación de
alternativas que sigue se conserva como registro de por qué se eligió. Cualquier librería auxiliar
adicional (mocks, DOM, HTTP) sigue requiriendo justificación según el Principio I; esta feature no
añade ninguna.

- `api/`:
  - Pruebas unitarias de `categorias.rules.ts` y de `parsearUsuarioActualId` /
    `inicializarUsuarioActual` (con errores de Prisma construidos en la prueba).
  - Pruebas HTTP: se importa `app` desde `src/app.ts`, se abre en un puerto efímero con
    `app.listen(0)` y se usa el `fetch` nativo de Node 22 (sin supertest).
- **Importar `app.ts` no requiere Neon** (ajuste 7):
  - `app.ts` solo crea Express y registra middlewares y rutas: no llama a `listen` ni a
    `inicializarUsuarioActual`.
  - `lib/prisma` se sustituye con `vi.mock` en todas las pruebas HTTP; aun sin mock, `PrismaClient`
    no conecta hasta la primera consulta.
  - Las pruebas llaman a `inicializarUsuarioActual()` en `beforeAll` contra el doble, recorriendo el
    mismo código que el arranque real.
- `web/`: entorno `node` (sin jsdom ni Testing Library), solo para `filtrarCategoriasParaMovimiento`
  de `web/services/categorias.service.ts`. Alias `@` en `vitest.config.ts`, sin plugins.
- Scripts `"test": "vitest run"` en ambos `package.json`, y en `api/` `"typecheck": "tsc --noEmit -p
  tsconfig.test.json"`, porque `api/tsconfig.json` solo incluye `src` y `prisma` y las pruebas no
  pasarían por `tsc`.
- `api/tsconfig.test.json` extiende la configuración base con `noEmit: true`, `module: "ESNext"` y
  `moduleResolution: "Bundler"` (hallazgo M1): con `module: Node16` y sin `"type": "module"`, los
  archivos `.ts` se tratan como CommonJS y las importaciones de `vitest` y `vitest/config` (paquetes
  ESM) pueden dar errores TS1479. El cambio solo afecta a la comprobación de tipos de pruebas, no al
  build de la API.
- Prerrequisito: `prisma generate` (genera el cliente; no toca la base) para importar los tipos y
  las clases de error de `@prisma/client`.

**Rationale**: Vitest ejecuta TypeScript sin transpilador adicional, tiene `vi.mock` y es la misma
herramienta en ambos paquetes; `fetch` nativo evita una segunda dependencia.

**Alternatives considered**: Jest + ts-jest (más configuración y dependencias); `node:test`
(importaciones sin extensión en CommonJS no resueltas con el stripping de tipos y mocks de módulo
experimentales); supertest (innecesario); Testing Library + jsdom (no hay lógica de componentes que
no pueda extraerse a funciones puras).

Versión: la última estable compatible con Node 22 y TypeScript 5 al implementar, fijada por
`package-lock.json`.

## R9. Pruebas sin Neon y límites de los dobles (DA-06, ajuste 5)

**Decision**:

- `api/tests/support/prisma-fake.ts`: Prisma en memoria con los métodos que usan los controladores
  (`usuario.findUnique`, `categoria.findMany/findUnique/create/update`, `cuenta.findUnique`,
  `movimiento.findUnique/count/create/update`, `$transaction(fn, opciones)`), con filtros de igualdad
  simples. `$transaction` invoca `fn` con el mismo doble y registra las opciones recibidas.
- El doble puede **programarse para lanzar** un `P2034` en N intentos, para verificar que el
  controlador reintenta hasta 3 veces y luego responde 409, y un `P2028` para verificar que **no**
  se reintenta y se responde 500 genérico.
- Las pruebas que usan el doble mockean `lib/prisma`; los valores de `transactionOptions` se
  verifican con una prueba unitaria de la constante exportada por `lib/prisma.ts`, no con
  PostgreSQL.
- `tests/setup.ts` fija, antes de cargar `env.ts`, `DATABASE_URL` a un host inexistente del dominio
  reservado `.invalid` y `CURRENT_USER_ID` a un valor de prueba. Como `dotenv` no sobrescribe
  variables existentes, ninguna prueba puede llegar a Neon aunque falte un mock.

**Qué prueban y qué NO prueban los dobles** (se escribe así en las descripciones de las pruebas y en
el PR):

- **Sí**: validaciones, códigos HTTP, forma de las respuestas, que los rechazos no escriban, que se
  pida `Serializable`, la cantidad de reintentos y la respuesta ante un `P2034` **simulado**.
- **No**: el aislamiento real de PostgreSQL, la detección de conflictos de SSI, la concurrencia real,
  la traducción de errores de Prisma a `P2034`, cuándo se produce realmente un `P2028`, la latencia
  de Neon ni la semántica de los filtros de Prisma sobre PostgreSQL. Ninguna prueba con dobles se nombra ni se reporta como "prueba de concurrencia" o
  "prueba de aislamiento".
- Lo anterior se cubre con los casos manuales de [quickstart.md](./quickstart.md) en una base
  aislada, y es la excepción registrada del Principio VII hasta resolver DA-06.

**Alternatives considered**: rama de Neon o PostgreSQL local (resuelve DA-06, pero exige una
decisión de entorno no aprobada); `vitest-mock-extended` (dependencia extra; los mocks profundos
aceptan cualquier llamada y ocultan errores).

## R10. Riesgos, contrato, validación y reversión

Ver [plan.md](./plan.md#riesgos-y-reversión). Sin cambios de esquema ni de datos: revertir los
commits restaura el comportamiento anterior. Orden de despliegue: configurar `CURRENT_USER_ID` →
API → web. Con D3, una API desplegada sin la variable no arranca (falla visible e inmediata).

## R11. Compatibilidad con las pantallas de Movimientos (ajuste 6)

| Situación | Antes | Después |
|---|---|---|
| Nuevo movimiento: opciones de categoría | Todas las activas de todos los usuarios, sin filtrar por tipo | Activas del usuario y del tipo elegido + "Sin categoría"; al cambiar el tipo se limpia la selección con aviso |
| Nuevo movimiento: usuario | `getUsuarios()[0]`; formulario bloqueado si no hay | Sin `USUId` ni bloqueo por usuario; lo decide el servidor |
| Web antigua + API nueva | — | Funciona si el primer usuario de la lista es el configurado; si no, el POST responde 400 y el formulario muestra el mensaje (ya lo hace `services/api.ts`) |
| Editar movimiento con categoría inactiva sin cambiarla | 409 (la opción no aparecía y el id se reenviaba) | 200; la opción aparece como "(inactiva)" |
| Editar movimiento histórico con categoría que no corresponde | 200 | 200; la opción aparece marcada como "(no corresponde al tipo)" |
| Cambiar el tipo en edición | Sin efecto sobre la categoría | Si la categoría deja de corresponder, se limpia con aviso; si se fuerza por API, 400/409 |
| Desactivar un movimiento propio | 200 | 200 (sin cambios) |
| Historial | Muestra el nombre de la categoría | Igual; las inactivas siguen visibles |

`MovementsTable` pasa a cargar todas las categorías del usuario (`getCategorias`) en lugar de solo las
activas, para poder mostrar la actual; el filtro de opciones lo hace la función pura del servicio.
