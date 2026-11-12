# Quickstart de validación: Gestión de Categorías

**Feature**: 001-gestion-categorias | Guía para comprobar la feature una vez implementada. No contiene
código de implementación. Contratos: [categorias.md](./contracts/categorias.md),
[movimientos.md](./contracts/movimientos.md). Reglas: [data-model.md](./data-model.md).

## Prerrequisitos

- Node.js 22 y dependencias instaladas en `api/` y `web/` (incluida Vitest, aprobada en D1).
- Cliente de Prisma generado en `api/` (`prisma generate`; no toca la base).
- `api/.env` con `DATABASE_URL`, `PORT` y **`CURRENT_USER_ID`** (solo se nombran las claves; nunca
  copiar sus valores en documentación, commits ni chats).
- `web/.env.local` con `NEXT_PUBLIC_API_URL`.
- **Agentes de IA**: no ejecutar `prisma migrate`, `db push`, `db execute`, `db seed` ni ninguna
  escritura contra Neon. Las pruebas automáticas no necesitan base de datos.

## 1. Puertas automáticas (sin base de datos)

Desde `api/`:

```bash
npx tsc --noEmit
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run build
```

Desde `web/`:

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run build
```

Resultado esperado: todo en verde. Los cambios que `npm run build` genere en `api/dist/` **no** se
incluyen en el commit (DA-08).

Cobertura mínima de `api/`:

| Área | Casos |
|---|---|
| `categorias.rules.ts` | Normalización (" Comida " = "comida"; "Café" ≠ "Cafe"); validación de nombre, tipo, color e ícono; `tipoCorresponde` para los tres pares y para un `CATTipo` inválido; `detectarDuplicados` (sin grupos, un grupo, activas + inactivas, tipos distintos no agrupan); `cambiosCategoria` y `cambiosMovimiento` (ausente ≠ cambio, mismo valor ≠ cambio, `CATId: null` frente a `null` persistido). |
| `usuario-actual.ts` | `parsearUsuarioActualId`: ausente, vacío, `"abc"`, `"0"`, `"-1"`, `"1.5"`, válido. `inicializarUsuarioActual`: usuario inexistente → error de configuración; `PrismaClientInitializationError` y `P1001` simulados → error de conexión; otro error → se propaga. `describirErrorArranque`: códigos 78/69/1 y mensajes sin valores. |
| `lib/prisma.ts` | La constante de opciones de transacción vale `maxWait: 5000` y `timeout: 10000`. |
| HTTP categorías | GET filtrado por usuario y **sin** campos de duplicados; `GET /duplicados` devuelve grupos y no llama a ningún método de escritura del doble; POST 201/400/409 (activo e inactivo); `USUId` del cuerpo ignorado; PATCH con y sin cambios efectivos y escritura solo de campos que cambian; cambio de tipo con movimientos 409; desactivar/activar 200/409; 404 para otro usuario; 500 sin `error` en el cuerpo; se solicita `Serializable` al crear y al cambiar nombre/tipo. |
| Manejo de errores **simulados** de transacción | `P2034` 1 vez → reintenta y 201; 3 veces → 409 de concurrencia; tras el reintento existe la otra categoría → 409 de duplicado; `P2028` → 500 genérico **sin** reintento. (No son pruebas de concurrencia ni de tiempos de PostgreSQL.) |
| HTTP movimientos | POST: categoría de otro tipo 400, de otro usuario 404, cuenta de otro usuario 404, `USUId` distinto 400, `USUId` igual 201, sin `USUId` 201. PATCH: conserva categoría inactiva 200 sin incluir `CATId`/`CUEId` en la escritura; cambio de tipo con categoría inactiva 409; cambio a categoría que no corresponde 400; histórico inconsistente sin cambios 200; movimiento de otro usuario 404. Desactivar: propio 200, ya desactivado 409, de otro usuario 404 sin cambios. `P2028` simulado → 500 genérico. Regresión: crear, editar y desactivar válidos responden igual que antes. |

Cobertura de `web/`: `filtrarCategoriasParaMovimiento` (solo activas del tipo elegido; en edición
incluye la actual inactiva o que no corresponde, con su marca; sin la actual si se cambió el tipo y ya
no corresponde).

Comprobación de aislamiento: `npm test` en `api/` sin red debe pasar igual.

## 2. Arranque de la API (sin escribir datos)

| # | Configuración | Resultado esperado |
|---|---|---|
| A1 | `CURRENT_USER_ID` válido y existente | `API running on …`; `GET /api/categorias` responde solo las del usuario. |
| A2 | Sin `CURRENT_USER_ID` | No arranca; `Error de configuración: CURRENT_USER_ID falta`; código 78. |
| A3 | `CURRENT_USER_ID=abc` | No arranca; error de configuración (formato); código 78. |
| A4 | Id que no existe | No arranca; error de configuración (usuario inexistente); código 78. |
| A5 | `DATABASE_URL` apuntando a un host inalcanzable (copia local de `.env`, sin credenciales reales) | No arranca; `Error de conexión a la base de datos …`; código 69. |

En ningún caso la consola muestra el valor de `CURRENT_USER_ID` ni la cadena de conexión. A1 solo
lee de la base (`findUnique`). Estos casos cubren el cableado de `server.ts` (que realmente salga con
78/69/1), que no se automatiza (excepción del Principio VII).

Lecturas de comprobación con la API en marcha:

```bash
curl -s http://localhost:4000/api/categorias
```

```bash
curl -s http://localhost:4000/api/categorias/duplicados
```

## 3. Casos manuales que escriben datos — SOLO en base aislada

**Regla (decisión H2)**: todos los casos de esta sección y de la sección 4 se ejecutan
**exclusivamente** contra una base aislada de desarrollo (DA-06): una rama de Neon o un PostgreSQL
local que no contenga datos financieros reales. **Nunca** contra la base Neon actual, aunque los
ejecute Andrés. Las categorías no se pueden borrar, así que cualquier registro de prueba quedaría
para siempre. Cualquier excepción futura requiere una autorización explícita y separada; no existe
ninguna autorizada. Si no hay base aislada disponible, estos casos quedan **pendientes** y la
excepción del Principio VII sigue abierta.

Preparación de la base aislada (la hace Andrés, no un agente): esquema aplicado y datos de prueba,
incluidos duplicados históricos para M9 (por ejemplo, "Comida" y "comida " del mismo tipo creadas con
el seed u otra herramienta sobre esa base aislada).

Cubren lo que los dobles no pueden demostrar: consultas reales de Prisma, aislamiento `Serializable`,
la forma real del conflicto de serialización y los tiempos de transacción.

| # | Pasos | Resultado esperado |
|---|---|---|
| M1 | Crear "Mascotas" (`gasto`) en `/categorias`; luego recargar `/movimientos` | Aparece activa; en `/movimientos` con tipo Gasto aparece y con Ingreso no (FR-019). |
| M2 | Crear " mascotas " (`gasto`) | Rechazo 409 con el nombre de la existente. |
| M3 | Desactivar "Mascotas" (confirmar) | Sigue en la lista como "Inactiva"; no aparece en nuevo movimiento. |
| M4 | Editar la descripción de un movimiento que usa una categoría inactiva | Se guarda; el selector la muestra con "(inactiva)". |
| M5 | En ese movimiento, cambiar el tipo | La UI limpia la categoría y avisa; si se fuerza por API, 409/400. |
| M6 | Abrir la edición de una categoría con movimientos e intentar cambiar el tipo | Antes de intentarlo se ve la advertencia general junto al tipo; al guardar, el backend rechaza con el mensaje de "tiene movimientos asociados". |
| M7 | Dos `POST` simultáneos con el mismo nombre y tipo (por ejemplo, dos `curl` en paralelo) | Solo uno crea; el otro responde 409 (duplicado o concurrencia). Registrar el error de Prisma observado: `P2034`, `40001` en un error desconocido, u otro. Si aparece `P2028`, registrarlo aparte: es un tiempo agotado, **no** un conflicto de serialización. |
| M8 | Pantalla a 360 px | Lista, diagnóstico y formularios sin desplazamiento horizontal. |
| M9 | Con duplicados históricos preparados, abrir `/categorias` | El diagnóstico los muestra; comparar el recuento de filas antes y después: sin cambios. |
| M10 | Dejar que la base aislada suspenda su compute (si lo permite) y crear una categoría o un movimiento | La operación se completa o, si supera `maxWait`/`timeout`, responde 500 genérico; registrar la latencia observada. |
| M11 | Usabilidad SC-001: con un cronómetro, desde abrir `/categorias` hasta ver la confirmación de una categoría válida creada | Registrar el tiempo y las dificultades observadas. Es una observación de usabilidad, no una garantía de rendimiento. |

Registrar la evidencia (petición → respuesta o captura) en el PR.

## 4. Regresión de Movimientos (SC-006) — SOLO en base aislada

Registrar, editar y desactivar un movimiento con y sin categoría desde `/movimientos`. Los únicos
cambios observables deben ser los de [movimientos.md](./contracts/movimientos.md).
