# Contrato: `/api/categorias`

**Feature**: 001-gestion-categorias | Forma de respuesta: `{ success, message, data }` (DA-05).

Reglas comunes:

- El usuario es siempre el configurado en el servidor (`CURRENT_USER_ID`), verificado al arrancar
  (la API no arranca si es inválido; ver [movimientos.md](./movimientos.md#arranque-de-la-api)).
  Cualquier `USUId` en el cuerpo se ignora.
- Una categoría que no existe o es de otro usuario → **404** `"La categoría indicada no existe"`.
- `:id` no entero positivo → **400** `"El id de la categoría es inválido"`.
- Error inesperado → **500** con mensaje genérico (`"Error al <operación> la categoría"`),
  `data: null`, sin objeto `error` ni stack.
- Todo error: `{ "success": false, "message": "<motivo>", "data": null }`.
- Transacción que no se inicia o expira (`P2028`; `maxWait` 5000 ms, `timeout` 10000 ms) → **500**
  con el mensaje genérico de la operación, sin reintento. No se confunde con el conflicto de
  serialización (`P2034`).

## GET `/api/categorias` (existente — cambio de contrato)

Devuelve las categorías **del usuario actual** (antes: de todos), activas e inactivas, ordenadas por
`CATNombre` asc. Sin campos de diagnóstico.

```json
{
  "success": true,
  "message": "Categorías obtenidas correctamente",
  "data": [
    { "CATId": 3, "CATNombre": "Comida", "CATTipo": "gasto", "CATColor": "#ef4444",
      "CATIcono": "utensils", "CATActiva": true, "CATCreadoEn": "2026-01-10T15:00:00.000Z", "USUId": 1 }
  ]
}
```

- `message` es aditivo. Antes: `{ success, data }` y, en el 500, `{ success, message, error }`.
- Consumidores: `web/services/categorias.service.ts` → `CreateMovementForm`, `MovementsTable` y la
  pantalla de Categorías.

## GET `/api/categorias/duplicados` (nuevo — diagnóstico de solo lectura)

Agrupa las categorías del usuario actual (activas e inactivas) por tipo recortado en minúsculas y
nombre normalizado (`trim().toLowerCase()`), y devuelve solo los grupos con más de una categoría. No
modifica nada. Solo lo consume la pantalla de Categorías.

```json
{
  "success": true,
  "message": "Diagnóstico de duplicados obtenido correctamente",
  "data": [
    {
      "tipo": "gasto",
      "nombreNormalizado": "comida",
      "categorias": [
        { "CATId": 3, "CATNombre": "Comida", "CATActiva": true },
        { "CATId": 9, "CATNombre": "comida ", "CATActiva": false }
      ]
    }
  ]
}
```

Sin duplicados → `"data": []`.

## POST `/api/categorias` (nuevo)

```json
{ "CATNombre": "Mascotas", "CATTipo": "gasto", "CATColor": "#f97316", "CATIcono": null }
```

| Caso | HTTP | `message` |
|---|---|---|
| Creada | 201 | `"Categoría creada correctamente"`, `data` = categoría con `CATActiva: true` |
| Nombre vacío / > 50 | 400 | `"CATNombre es requerido y debe tener como máximo 50 caracteres"` |
| Tipo inválido | 400 | `"CATTipo debe ser uno de: ingreso, gasto, ahorro"` |
| Color inválido | 400 | `"CATColor debe tener el formato #RRGGBB"` |
| Ícono inválido | 400 | `"CATIcono debe ser texto de hasta 50 caracteres"` |
| Duplicado activo | 409 | `"Ya existe la categoría \"Comida\" de tipo gasto"` |
| Duplicado inactivo | 409 | `"Ya existe la categoría \"Comida\" de tipo gasto (inactiva); puedes reactivarla"` |
| Conflicto de serialización tras 3 intentos | 409 | `"Otra operación modificó las categorías al mismo tiempo; intenta de nuevo"` |

Concurrencia: la lectura de duplicados y la escritura se ejecutan en una transacción `Serializable`
con hasta 3 intentos ante `P2034`. Si en el reintento ya existe la otra categoría, la respuesta es el
409 de duplicado. Límites sin `UNIQUE`: ver [research.md](../research.md#r4-validación-de-duplicados-sin-cambiar-el-esquema).

## PATCH `/api/categorias/:id` (nuevo)

Cuerpo parcial con cualquiera de `CATNombre`, `CATTipo`, `CATColor`, `CATIcono`. `CATActiva`,
`CATId`, `USUId` y `CATCreadoEn` se ignoran. Las reglas solo se evalúan para los campos que
**cambian** respecto de lo persistido (FR-026; ver [data-model.md](../data-model.md)) y la
actualización escribe solo esos campos. Si cambia el nombre o el tipo, se usa la misma transacción
`Serializable` con reintentos que en el POST.

| Caso | HTTP | `message` |
|---|---|---|
| Actualizada (o sin cambios efectivos) | 200 | `"Categoría actualizada correctamente"` |
| Validación de un campo que cambia | 400 | mismos mensajes que POST |
| Nombre/tipo nuevo duplicado | 409 | mismos mensajes que POST |
| Cambio de tipo con movimientos | 409 | `"No se puede cambiar el tipo: la categoría tiene movimientos asociados"` |
| Conflicto de serialización tras 3 intentos | 409 | mismo mensaje que POST |
| No existe / otro usuario | 404 | `"La categoría indicada no existe"` |

Ejemplo — cambio de color sobre un duplicado histórico, reenviando nombre y tipo iguales:

```json
{ "CATNombre": "Comida", "CATTipo": "gasto", "CATColor": "#22c55e" }
```

→ 200; no se evalúan la unicidad ni el tipo.

## PATCH `/api/categorias/:id/desactivar` y `/:id/activar` (nuevos)

Sin cuerpo. Lectura y escritura dentro de `prisma.$transaction` (aislamiento por omisión).

| Caso | HTTP | `message` |
|---|---|---|
| Desactivada | 200 | `"Categoría desactivada correctamente"`, `data.CATActiva = false` |
| Activada | 200 | `"Categoría activada correctamente"`, `data.CATActiva = true` |
| Ya inactiva | 409 | `"La categoría ya se encuentra inactiva"` |
| Ya activa | 409 | `"La categoría ya se encuentra activa"` |
| No existe / otro usuario | 404 | `"La categoría indicada no existe"` |

Desactivar no modifica movimientos ni presupuestos. Activar no revalida duplicados (las inactivas ya
cuentan para la unicidad).
