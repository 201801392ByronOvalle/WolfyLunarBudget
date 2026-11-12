# Verificación manual — 001-gestion-categorias

Registro de las verificaciones manuales (T062, T071–T073). Sin valores de configuración ni cadenas de
conexión.

## Entorno de verificación

- **Base**: PostgreSQL 18.7 **local** (`localhost:5432`, base `lunarbudget_test`), preparada el
  2026-11-12 con las dos migraciones existentes (`migrate deploy`), sin cambios de esquema. **No es
  la base Neon**, que no se usó ni se modificó.
- **Destino verificado** antes de cada paso con consultas de solo lectura: `current_database()` =
  `lunarbudget_test`, `inet_server_addr()` = `::1` (loopback), puerto 5432.
- **Configuración**: archivo local excluido de Git (`.git/info/exclude`); `CURRENT_USER_ID` = id del
  usuario de prueba (1, obtenido de la base).
- **Datos de prueba** (usuario 1, marcados `[PRUEBA-001]`): 2 cuentas (una inactiva), 7 categorías
  (ingreso, gasto, ahorro, una con tipo histórico `otros`, dos inactivas y un duplicado normalizado
  «Comida» / «comida ») y 6 movimientos (uno con categoría inactiva, uno `INGRESO` con categoría de
  gasto, uno sin categoría y uno en la cuenta inactiva).
- **API**: `npm run dev` con el entorno local cargado explícitamente; arrancó tras validar
  `CURRENT_USER_ID` y `GET /health` respondió `OK`. **Web**: `next dev` con
  `NEXT_PUBLIC_API_URL` → `localhost:4000`.

## T062 — Compatibilidad del frontend con Movimientos (2026-11-12)

**Resultado: verificada.** Revisión en `/movimientos` con la API real (`fetch` nativo, sin
interceptaciones ni respuestas simuladas) y **sin guardar nada**.

Estado de los datos al empezar: las categorías 2 «Comida» y 3 «comida » tenían el estado activo
intercambiado respecto de la carga inicial (2 inactiva, 3 activa). El cambio es anterior a la
revisión (la huella de los datos tomada al empezar ya lo incluía) y no lo produjo T062. La revisión se
hizo con ese estado.

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Nuevo movimiento, tipo Ingreso | Solo «Salario» además de «Sin categoría». ✅ |
| 2 | Nuevo movimiento, tipo Gasto | «comida» (3, activa) y «Transporte». No aparecen «Comida» (2) ni «Gimnasio» (inactivas) ni «Varios» (tipo `otros`). ✅ |
| 3 | Nuevo movimiento, tipo Ahorro | Solo «Fondo de emergencia». ✅ |
| 4 | Elegir «comida» con Gasto y cambiar a Ingreso | Se limpia la selección y aparece: «Se quitó la categoría “comida” porque no corresponde a ingreso. Elige otra o deja “Sin categoría”.» ✅ |
| 5 | Cambiar el tipo sin categoría elegida | No se muestra aviso. ✅ |
| 6 | Editar «Cuota gimnasio» (GASTO, Gimnasio inactiva) | Seleccionada «Gimnasio (inactiva)»; además «comida» y «Transporte». ✅ |
| 7 | Editar «Supermercado» (GASTO, Comida inactiva) | Seleccionada «Comida (inactiva)». ✅ |
| 8 | Editar «Reembolso histórico» (INGRESO con Comida, de gasto e inactiva) | Seleccionada «Comida (inactiva)»; además «Salario». ✅ (ver observación O-1) |
| 9 | Editar «Salario de octubre» y «Gasto sin categoría» | Opciones del tipo; sin marcas. ✅ |
| 10 | En la edición de «Cuota gimnasio», cambiar a Ingreso | Se limpia la categoría con el aviso «Se quitó la categoría “Gimnasio” porque no puede usarse con ingreso…»; al volver a Gasto, «Gimnasio (inactiva)» vuelve a ofrecerse. ✅ |
| 11 | Cancelar cada edición | El editor se cierra y no se envía ninguna petición de escritura. ✅ |
| 12 | Escritorio (1009 px) | Sin desplazamiento horizontal. ✅ |
| 13 | 360 px | **Desplazamiento horizontal de 8 px** (contenido de 368 px). ❌ Incidencia I-1 (corregida después en `1e7969d`; ver abajo) |

**Evidencia de la API real y de ausencia de escrituras**

- Peticiones de la pestaña a `localhost:4000`: solo `GET` (`/api/cuentas`, `/api/categorias`,
  `/api/movimientos`), todas 200; ningún `POST` ni `PATCH`.
- Huella de solo lectura (conteo y `md5` de todas las filas de cada tabla) idéntica antes y después:
  1 usuario, 2 cuentas, 7 categorías, 6 movimientos, 0 metas y 0 presupuestos.

### Incidencias y observaciones

- **I-1 (defecto corregido; afectaba a FR-017 / SC-007, M8)**: a 360 px, en la lista de movimientos, el
  bloque derecho de cada fila (monto, «Editar» y «Desactivar») no se ajusta. Con un monto como
  «+Q3000.00» su ancho mínimo (≈244 px) supera el disponible (≈240 px) y la página se desborda 8 px.
  Comprobado en la pestaña: con `flex-wrap` en ese bloque el ancho queda en 360 px. Corrección
  propuesta (pendiente de aprobación, fuera del alcance de T062): `flex flex-wrap items-center
  gap-x-4 gap-y-2` en ese contenedor de `web/components/movimientos/MovementsTable.tsx`. La revisión
  de US5 con datos simulados (montos cortos, 375 px) no lo detectó.
  - **Corregida el 2026-11-12** (commit `1e7969d`): se aplicó esa clase al contenedor. Verificado
    con la API real y la base local: a 360 px y 375 px el ancho del documento es igual al del
    viewport (sin desplazamiento); con «+Q3000.00» los botones bajan a la línea siguiente y siguen
    visibles; en escritorio (1009 px) las seis filas mantienen monto y botones en una sola línea.
    Editar y Cancelar siguen funcionando sin desbordamiento y los botones conservan su foco
    visible. Solo hubo peticiones `GET` y la huella de los datos no cambió. `npm test` (7/7),
    `tsc`, `lint` y el detector de impeccable sin hallazgos.
- **O-1 (observación)**: cuando la categoría histórica está inactiva **y** no corresponde al tipo,
  solo se muestra «(inactiva)» (`filtrarCategoriasParaMovimiento` da prioridad al estado inactivo).
  La marca «(no corresponde al tipo)» no se pudo ver con datos reales porque, con el estado actual,
  ningún movimiento usa una categoría **activa** de tipo incompatible; está cubierta por las pruebas
  automatizadas (T052) y se revisará en M4/M5 (T072).

## T071 — Arranque de la API, casos A1–A5 (2026-11-12)

**Resultado: verificada; los cinco casos cumplen el contrato** (`contracts/movimientos.md`,
"Arranque de la API"; `quickstart.md` §2).

**Ejecución.** El agente la ejecutó con la autorización de Andrés, contra la base **local**
`lunarbudget_test` en lugar de Neon (desviación del texto de T071, que preveía A1 sobre Neon; este
equipo no tiene acceso a Neon). Se ejecutó el `src/server.ts` real con `ts-node`, en procesos
auxiliares independientes:

- Cada proceso recibió de forma explícita `DATABASE_URL`, `CURRENT_USER_ID`, `PORT` y `NODE_ENV`.
  Prisma Client carga `api/.env` sin sobrescribir las variables ya definidas, y `api/.env` contiene
  `DATABASE_URL` (Neon) y `CURRENT_USER_ID`; definirlas todas evita que se cuele alguno de esos
  valores.
- `cwd` en una carpeta vacía, para que `dotenv` (en `src/config/env.ts`) no encontrara ningún `.env`.
- Puertos alternativos 4101–4105. La API principal del puerto 4000 no se detuvo ni se modificó, y
  siguió respondiendo `/health` = `OK`.
- No se modificó ningún `.env` persistente. Solo hubo lecturas (`findUnique` del usuario y, en A1,
  `GET /api/categorias`): la huella de los datos (conteo y `md5` por tabla) fue idéntica antes y
  después.

| Caso | Configuración | Salida en consola | Código de salida | Resultado |
|---|---|---|---|---|
| A1 | `CURRENT_USER_ID` válido (usuario de prueba) | `API running on http://localhost:4101`; `GET /health` → 200 `{"success":true,"status":"OK"}`; `GET /api/categorias` → 200 con 7 filas | — (arrancó; el proceso auxiliar se detuvo al terminar) | ✅ |
| A2 | `CURRENT_USER_ID` vacío | `Error de configuración: CURRENT_USER_ID falta` | 78 | ✅ |
| A3 | `CURRENT_USER_ID=abc` | `Error de configuración: CURRENT_USER_ID no es un entero positivo` | 78 | ✅ |
| A4 | Id inexistente | `Error de configuración: CURRENT_USER_ID no corresponde a un usuario existente` | 78 | ✅ |
| A5 | `DATABASE_URL` a un puerto local cerrado (`127.0.0.1`, credenciales ficticias) | `Error de conexión a la base de datos al verificar CURRENT_USER_ID` | 69 | ✅ |

En ningún caso la consola mostró la cadena de conexión, la contraseña ni el valor de
`CURRENT_USER_ID`; se comprobó automáticamente en la salida de cada proceso. Al terminar no quedó
ningún puerto auxiliar en uso. Esto cubre el cableado de salida de `server.ts` (78/69) que no se
automatiza (excepción del Principio VII). El código 1 ("otro error inesperado") no tiene un caso
manual en `quickstart.md`; lo cubren las pruebas unitarias de `describirErrorArranque`.

**Notas**

- **A2 con la variable vacía.** Se probó con `CURRENT_USER_ID` definido pero vacío, que el contrato
  trata igual que ausente (`parsearUsuarioActualId` convierte `undefined` en `""`). Con la variable
  realmente ausente, Prisma Client la completaría desde `api/.env`, que sí la define, y el caso no
  sería representativo.
- **Observación O-2.** Por esa misma carga automática, al iniciar la API desde `api/` cualquier
  variable que no se defina explícitamente se toma de `api/.env`, que apunta a Neon. Por eso las
  instrucciones de la base local cargan siempre `api/.env.test.local` completo antes de arrancar.
  Comportamiento previo, sin cambios de código.

## T072–T073

Pendientes.
