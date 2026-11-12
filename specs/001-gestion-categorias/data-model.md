# Data Model: Gestión de Categorías

**Feature**: 001-gestion-categorias | **Fecha**: 2026-11-12

**Sin cambios de esquema.** `api/prisma/schema.prisma` y `api/prisma/migrations/` no se modifican. Todas
las reglas siguientes se validan en la aplicación (Constitución IV). No se corrige ni normaliza ningún
registro existente (FR-020, FR-026).

## Categoria (`WLB_CATEGORIA`)

| Campo | Tipo Prisma | Editable | Regla (creación / edición de un campo que cambia) |
|---|---|---|---|
| `CATId` | Int, PK autoincremental | No | — |
| `CATNombre` | String | Sí | Recortado, no vacío, ≤ 50 caracteres; único por (`USUId`, `CATTipo`, nombre normalizado). Se guarda recortado. |
| `CATTipo` | String | Sí, solo si no tiene movimientos | Exactamente `ingreso` \| `gasto` \| `ahorro`. |
| `CATColor` | String? | Sí | `null` o `#RRGGBB` (`/^#[0-9a-fA-F]{6}$/`). `""` se guarda como `null`. |
| `CATIcono` | String? | Sí | `null` o texto recortado de 1 a 50 caracteres. `""` se guarda como `null`. |
| `CATActiva` | Boolean, default `true` | Solo por activar/desactivar | — |
| `CATCreadoEn` | DateTime, default `now()` | No | — |
| `USUId` | Int, FK → `Usuario` | No | Siempre el usuario configurado (`CURRENT_USER_ID`); nunca sale del cuerpo. |

**Valores derivados (no persistidos)**

- `nombreNormalizado = CATNombre.trim().toLowerCase()` (tildes y espacios internos se conservan).
- `tieneMovimientos = count(Movimiento where CATId = id) > 0`, incluidos los movimientos desactivados.
- Grupo de duplicados históricos: categorías del mismo usuario con igual `CATTipo` recortado en
  minúsculas e igual `nombreNormalizado`. Solo se calcula en el diagnóstico de solo lectura
  `GET /api/categorias/duplicados`; no forma parte de `Categoria` ni del GET del catálogo.

**Límite de la unicidad**: no hay restricción `UNIQUE` en PostgreSQL. La unicidad la garantiza la
aplicación con transacciones `Serializable` y hasta 3 intentos ante `P2034`; las escrituras fuera de
la API no quedan protegidas ([research.md](./research.md), R4).

**Reglas de edición (FR-026)**

- Un campo "cambia" solo si viene en el cuerpo y su valor normalizado difiere del persistido.
- Cambia `CATNombre` o `CATTipo` → FR-005 sobre el valor nuevo + unicidad excluyendo la propia
  categoría.
- Cambia `CATTipo` y `tieneMovimientos` → 409.
- No cambian → no se revalidan, aunque el registro sea un duplicado histórico, tenga un `CATTipo`
  fuera de los tres valores o un nombre histórico de más de 50 caracteres.

**Transiciones de estado**

```text
            desactivar (confirmación en UI)
  activa  ───────────────────────────────▶  inactiva
          ◀───────────────────────────────
                     activar
```

- Repetir la transición sobre el estado actual → 409, sin cambios (FR-012).
- Nunca se borra físicamente. Desactivar no toca movimientos ni presupuestos (FR-010, FR-011).

## Movimiento (`WLB_MOVIMIENTO`) — solo reglas que cambian

| Campo | Regla nueva |
|---|---|
| `USUId` | Crear: el configurado; si el cuerpo trae otro → 400; si coincide o se omite → configurado. Editar: nunca se escribe. Editar o desactivar un movimiento de otro usuario → 404. |
| `CUEId` | Crear, o editar con cambio: la cuenta debe existir, ser del usuario configurado (si no → 404 sin revelar) y estar activa. |
| `CATId` | Crear: si no es `null`, la categoría debe existir, ser del usuario (si no → 404), estar activa (409) y corresponder a `MOVTipo` (400). Editar: igual, pero solo si cambian `CATId` o `MOVTipo` y la categoría resultante no es `null`. Si ninguno cambia, se conserva la categoría histórica aunque esté inactiva o no corresponda. |
| `MOVTipo` | Sin cambios en los valores admitidos (`INGRESO`, `GASTO`, `AHORRO`). |

**Escritura en la edición (C1)**: la actualización incluye solo los campos que cambian; `CATId` y
`CUEId` sin cambios no se envían a Prisma. Lo mismo aplica a la edición de categorías.

**Correspondencia**: `CATTipo.trim().toUpperCase() === MOVTipo` (`ingreso`↔`INGRESO`,
`gasto`↔`GASTO`, `ahorro`↔`AHORRO`). Un `CATTipo` histórico fuera de los tres valores nunca
corresponde.

## Usuario (`WLB_USUARIO`)

Sin cambios. El "usuario actual" es el `USUId` de `CURRENT_USER_ID`, verificado una sola vez al
arrancar con `usuario.findUnique` (solo lectura). Si falta, es inválido o no existe, la API no
arranca (error de configuración, salida 78); si no se puede consultar la base, tampoco (error de
conexión, salida 69). No es autenticación (FR-014).

## Cuenta y PresupuestoMensual

Sin cambios. `Cuenta` solo se lee para validar pertenencia y estado. `PresupuestoMensual` no se lee
ni se escribe; existe para recordar que una categoría no puede borrarse.

## Tipos del frontend (`web/types/`)

- `categoria.ts`:
  - `TIPOS_CATEGORIA = ["ingreso", "gasto", "ahorro"] as const` y `TipoCategoria`.
  - `Categoria` sin cambios (refleja 1:1 la tabla; `CATTipo` sigue siendo `string` porque puede haber
    valores históricos fuera de la unión).
  - `CategoriasResponse` sin campos nuevos (`message` ya estaba declarado y ahora sí llega).
  - Nuevos `GrupoDuplicadoCategoria` (`tipo`, `nombreNormalizado`,
    `categorias: Pick<Categoria, "CATId" | "CATNombre" | "CATActiva">[]`) y
    `DuplicadosCategoriasResponse`.
  - Nuevos `CategoriaResponse`, `CrearCategoriaPayload`
    (`CATNombre`, `CATTipo`, `CATColor?`, `CATIcono?`) y `EditarCategoriaPayload = Partial<…>`.
- `movimiento.ts`: `CrearMovimientoPayload` deja de incluir `USUId` (el contrato lo acepta como
  opcional, pero la web ya no lo envía).
