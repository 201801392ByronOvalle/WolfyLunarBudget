# Contrato: `/api/movimientos` y arranque de la API — cambios de esta feature

**Feature**: 001-gestion-categorias. Solo se describen los cambios; el resto del contrato vigente
(`movimientos.controller.ts`) se mantiene. Consumidores afectados: `web/services/movimientos.service.ts`
→ `CreateMovementForm`, `MovementsTable`.

Sin cambios: `GET /api/movimientos` (sigue sin filtrar por usuario; riesgo residual en el plan).

Común a POST, PATCH y desactivar: lectura y escritura dentro de `prisma.$transaction` (aislamiento
por omisión; `maxWait` 5000 ms y `timeout` 10000 ms). Errores
`{ "success": false, "message": "<motivo>", "data": null }`. Una transacción que no se inicia o
expira (`P2028`) responde **500** con el mensaje genérico actual de la operación, sin reintento.

## Arranque de la API

No es un endpoint, pero cambia la disponibilidad de todos (decisión D3):

| Condición al iniciar | Resultado |
|---|---|
| `CURRENT_USER_ID` ausente o vacío | No arranca. Consola: `Error de configuración: CURRENT_USER_ID falta`. Código de salida 78. |
| No es un entero positivo | No arranca. `Error de configuración: CURRENT_USER_ID no es un entero positivo`. 78. |
| No existe ese usuario | No arranca. `Error de configuración: CURRENT_USER_ID no corresponde a un usuario existente`. 78. |
| No se puede conectar a la base para verificarlo | No arranca. `Error de conexión a la base de datos al verificar CURRENT_USER_ID`. 69. |
| Otro error inesperado | No arranca. Mensaje genérico de arranque. 1. |
| Todo correcto | Arranca y escucha en `PORT`. |

Los mensajes nunca incluyen el valor configurado ni la cadena de conexión.

## POST `/api/movimientos` — cambio de contrato

| Cambio | Antes | Después |
|---|---|---|
| `USUId` | Requerido | **Opcional**. Si viene y difiere del configurado → **400** `"USUId no corresponde al usuario actual del servidor"`. Si coincide o se omite, se usa el configurado (compatibilidad de transición). |
| Cuenta de otro usuario | Aceptada | **404** `"La cuenta indicada no existe"` |
| Categoría de otro usuario | Aceptada | **404** `"La categoría indicada no existe"` |
| Categoría de tipo distinto | Aceptada | **400** `"La categoría no corresponde al tipo del movimiento"` |
| Categoría inactiva | 409 | 409 (sin cambios) |
| Usuario inexistente (404 `"El usuario indicado no existe"`) | Posible | Ya no aplica: el usuario se verifica al arrancar |

```json
{ "CUEId": 2, "CATId": 3, "MOVTipo": "INGRESO", "MOVMonto": 150.5, "MOVFecha": "2026-11-12" }
```

Con `CATId: 3` de tipo `gasto` → `400`,
`{ "success": false, "message": "La categoría no corresponde al tipo del movimiento", "data": null }`.

## PATCH `/api/movimientos/:id` — cambio de contrato

Un campo "cambia" si viene en el cuerpo y difiere del valor persistido (`CATId` comparado como
`body.CATId ?? null`). La actualización escribe solo los campos que cambian: `CATId` y `CUEId` sin
cambios no se incluyen en los datos enviados a Prisma (decisión C1).

| Situación | Antes | Después |
|---|---|---|
| Movimiento de otro usuario | Se editaba | **404** `"El movimiento indicado no existe"` |
| Reenvía `CATId` inactivo sin cambiar `MOVTipo` ni `CATId` | 409 | **200**, conserva la categoría |
| Histórico con categoría que no corresponde; no cambian `MOVTipo` ni `CATId` | 200 | 200 (sin corregir la inconsistencia) |
| Cambia `MOVTipo` o `CATId` y la categoría resultante está inactiva | 409 solo si se enviaba `CATId` | **409** `"La categoría indicada está inactiva"` (también si solo cambió el tipo) |
| Cambia `MOVTipo` o `CATId` y la categoría resultante no corresponde | 200 | **400** `"La categoría no corresponde al tipo del movimiento"` |
| Cambia `MOVTipo` o `CATId` y la categoría resultante es de otro usuario | 200 | **404** `"La categoría indicada no existe"` |
| Cambia `CUEId` a una cuenta de otro usuario | 200 | **404** `"La cuenta indicada no existe"` |
| Reenvía `CUEId` igual y la cuenta está inactiva | 409 | 409 (sin cambios; riesgo residual) |
| `USUId` en el cuerpo | Ignorado | Ignorado |

Ejemplo — editar la descripción de un movimiento con categoría inactiva, reenviando todo:

```json
{ "CUEId": 2, "CATId": 7, "MOVTipo": "GASTO", "MOVMonto": 80, "MOVDescripcion": "Cena", "MOVFecha": "2026-10-01" }
```

Con `CATId` y `MOVTipo` iguales a los guardados y la categoría 7 inactiva → `200`,
`"Movimiento actualizado correctamente"`.

## PATCH `/api/movimientos/:id/desactivar` — cambio de contrato (ampliación de alcance)

| Situación | Antes | Después |
|---|---|---|
| Movimiento propio activo | 200 `"Movimiento desactivado correctamente"` | 200 (sin cambios) |
| Movimiento propio ya desactivado | 409 | 409 (sin cambios) |
| Movimiento inexistente | 404 | 404 (sin cambios) |
| Movimiento de otro usuario | 200 (se desactivaba) | **404** `"El movimiento indicado no existe"`, sin modificar nada |
