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

## T072 — Casos M1–M10 y regresión §4 (2026-11-12)

**Resultado: ejecutada y evaluada.** Todos los casos se ejecutaron. Se encontró un defecto, D-1,
corregido después en `483b3be`, y queda una parte de M10 que no se puede reproducir de forma segura en
local.

**Preparación y salvaguardas**

- Destino comprobado por lectura antes de escribir: `lunarbudget_test` en `::1:5432`. La API
  principal (puerto 4000) devolvía los mismos datos que la base. Esquema y migraciones sin cambios
  (`git diff` de `api/prisma` vacío; 2 migraciones aplicadas).
- **Respaldo previo** con `pg_dump -Fc` (estructura y datos), fuera del repositorio, en la carpeta
  `lunarbudget-respaldos` del perfil de usuario: `lunarbudget_test_antes_T072_20261112_170613.dump`
  (21 679 bytes). `pg_restore --list` confirma las 7 tablas con sus datos, las claves primarias, las
  8 claves foráneas y el índice único.
- **Estado previo**: 1 usuario, 2 cuentas, 7 categorías (ids 1–7), 6 movimientos (ids 1–6), 0 metas y
  0 presupuestos; huella idéntica a la de T071.
- Escrituras **solo** sobre datos de prueba del usuario 1, a través de la API real (script HTTP y
  navegador) y, para observar M7 y M10, scripts de diagnóstico sobre la base local. No se usó Neon.

**Resultados**

| Caso | Pasos | Resultado observado | Evaluación |
|---|---|---|---|
| M1 | `POST` «Mascotas» (`gasto`); recargar `/movimientos` | 201, `CATId=8`, activa, `USUId=1`. En `/movimientos`, las categorías creadas (las `[M7]`) aparecen con Gasto y no con Ingreso tras recargar (FR-019). | ✅ |
| M2 | `POST` « mascotas », «MASCOTAS» y «Comida» (`gasto`) | 409 `Ya existe la categoría "Mascotas" de tipo gasto` (dos veces); 409 contra el duplicado histórico «comida». Sin filas nuevas. | ✅ |
| M3 | Desactivar «Mascotas», repetir, crear un movimiento con ella, reactivar, repetir, desactivar | 200 / 409 `ya se encuentra inactiva` / 409 `La categoría indicada está inactiva` (sin movimiento creado) / 200 / 409 `ya se encuentra activa` / 200. Sigue en la lista como «Inactiva» y no se ofrece en movimientos nuevos. | ✅ |
| M4 | Editar la descripción del movimiento 2 (Gimnasio inactiva) reenviando todo; ídem en el 3 (INGRESO con categoría de gasto) | 200 en ambos; `CATId` 6 y 2 conservados y el tipo histórico sin corregir. En la interfaz, «(inactiva)» (T062). | ✅ |
| M5 | Forzar por API: mov 2 → INGRESO con Gimnasio; mov 5 → GASTO con Salario; mov 2 → Comida (inactiva); mov 4 → Salario; `POST` INGRESO con Transporte; `POST` con `USUId` distinto; mov 4 → cuenta inactiva | 409 inactiva / 400 no corresponde / 409 inactiva / 400 / 400 / 400 `USUId no corresponde…` / 409 cuenta inactiva. Los movimientos no cambiaron. La interfaz limpia la categoría con aviso (T062). | ✅ |
| M6 | Cambiar el tipo de «Comida» (con movimientos) por API y en la interfaz; cambiar el tipo de «Transporte» (sin movimientos) ida y vuelta; editar el color de «Varios» (tipo `otros`) | 409 `No se puede cambiar el tipo: la categoría tiene movimientos asociados`; en la interfaz, la advertencia general junto al tipo y el error en línea con el foco en el tipo. 200 y 200 en Transporte. 200 en Varios sin revalidar el tipo histórico. | ✅ |
| M6 · D-1 | Editar «comida » (duplicado histórico, con espacio final) reenviando nombre y tipo idénticos y cambiando solo el color | **409** `Ya existe la categoría "Comida" de tipo gasto (inactiva)…`. Esperado: 200 (US3-9, US3-12). Desde el formulario web (que envía solo el color) → 200. | ❌ D-1 (corregido en `483b3be`: ahora 200) |
| M7 | 3 pares de `POST` simultáneos con el mismo nombre y tipo | Cada par: un 201 y un 409 de duplicado; exactamente 1 fila por nombre. | ✅ |
| M7 · error | Diagnóstico: dos transacciones `Serializable` concurrentes (lectura + creación), sin reintentos | La perdedora falla con `PrismaClientKnownRequestError` **`P2034`** («Transaction failed due to a write conflict or a deadlock»), sin `40001` en el mensaje. Coincide con `esErrorDeSerializacion`; no hace falta ninguna corrección. | ✅ |
| M8 | `/categorias` y `/movimientos` a 360 px con datos reales | `/categorias`: lista, aviso de duplicados, formulario de creación y edición (con la nota del tipo histórico) sin desplazamiento horizontal. `/movimientos`: sin desplazamiento tras la corrección de I-1. | ✅ |
| M9 | Abrir `/categorias` con los duplicados históricos | Aviso «Gasto: "Comida" (inactiva), "comida "» y la marca «Duplicada» en ambas. La huella de categorías y movimientos es idéntica antes y después de recargar. | ✅ |
| M10 | Mecanismo controlado: una sesión bloquea la fila de «Transporte» con `SELECT … FOR UPDATE` 14 s (sin modificar datos); la API intenta desactivarla | 500 `Error al desactivar la categoría`; la API registró `… expirada (P2028)`; la categoría quedó sin cambios. La respuesta llegó a los ≈14 s (al liberarse el bloqueo), no a los 10 s (O-3). | ✅ parcial |
| §4 | En `/movimientos`: registrar GASTO con Transporte e INGRESO sin categoría; editar monto y descripción; desactivar ambos | `POST` 201 ×2 (movimientos 7 y 8), `PATCH` 200 ×2, `PATCH …/desactivar` 200 ×2. En la base: 47.50 y descripción editada; ambos `MOVActiva=false`; asociaciones intactas. | ✅ |

Para desactivar desde la interfaz, el diálogo nativo `window.confirm` se aceptó de forma automática
en la pestaña; las peticiones a la API fueron reales.

**Defectos y observaciones**

- **D-1 (defecto corregido el 2026-11-12, commit `483b3be`; severidad baja; FR-026, US3-9, US3-12).**
  Descripción original, conservada: `cambiosCategoria`
  (`api/src/modules/categorias/categorias.rules.ts`) considera que el nombre cambia si
  `CATNombre.trim() !== existente.CATNombre`. Si el nombre guardado tiene espacios alrededor (dato
  histórico, como «comida »), reenviar exactamente el mismo nombre cuenta como cambio. Eso dispara la
  unicidad y el 409, aunque solo cambie el color. No afecta a la web, que envía solo los campos
  modificados, pero sí a cualquier cliente que reenvíe la categoría completa. Las pruebas
  automatizadas no lo cubrían: sus duplicados históricos no tenían espacios en el nombre guardado.
  Corrección propuesta (pendiente de aprobación): no considerar cambio un nombre recibido idéntico al
  guardado (`CATNombre !== existente.CATNombre && CATNombre.trim() !== existente.CATNombre`), con una
  prueba de regresión. Hay que resolver la tensión de redacción entre FR-026 («normalizado como se
  guardaría») y US3-12 («los mismos valores que ya están guardados»).
  - **Regla aprobada por Andrés**: un campo reenviado exactamente igual al valor guardado no es un
    cambio, aunque sea un dato histórico que no cumple las validaciones actuales. Si el valor cambia
    de verdad, se aplican la normalización, la validación y la unicidad existentes. Nunca se
    normaliza un valor histórico que no cambió.
  - **Corrección** (`483b3be`): `cambiosCategoria` añade `CATNombre !== existente.CATNombre` antes de
    comparar el nombre recortado, y `cambiaTextoOpcional` devuelve «sin cambio» si el valor recibido
    es idéntico al guardado. Así la regla se aplica también a `CATColor` y `CATIcono`, que tenían la
    misma pauta. `CATTipo` ya se comparaba sin normalizar.
  - **Pruebas de regresión** (fallaban antes de la corrección: 409, 400 y `nombre: true`; pasan
    después): 3 HTTP en `categorias.edicion.test.ts` (nombre histórico «comida » reenviado idéntico
    más color → 200 escribiendo solo `CATColor`, sin unicidad; un cambio real —nombre recortado o
    vacío— sigue respondiendo 409/400 sin escribir; color histórico « #ABC» reenviado idéntico no se
    revalida) y 2 unitarias en `categorias.rules.test.ts`. Suite completa: 240/240; `typecheck`,
    `tsc` y compilación sin errores (compilada fuera de `api/dist`).
  - **Evidencia en PostgreSQL local**: destino verificado (`lunarbudget_test` en `::1:5432`); la API
    principal se reinició con el código corregido y servía las mismas 13 categorías que la base.
    `PATCH /api/categorias/3` con `{"CATNombre":"comida ","CATTipo":"gasto","CATColor":"#15803d"}` →
    **200**; en la base, `CATNombre` sigue siendo «comida » (7 caracteres) y `CATColor` = `#15803d`.
    `PATCH` con `{"CATNombre":"comida"}` (cambio real) → **409** `Ya existe la categoría "Comida" de
    tipo gasto (inactiva)…`, sin cambios en la fila.
- **O-3 (observación, relacionada con R-12).** Si la transacción espera un bloqueo, `P2028` no corta
  la espera: la API responde cuando la sentencia bloqueada termina (aquí ≈14 s). El resultado es el
  esperado (500 genérico, sin cambios, sin reintento).
- **M10 pendiente en parte**: la suspensión del compute y el agotamiento de `maxWait` (no obtener una
  conexión en 5 s) no son reproducibles de forma segura en PostgreSQL local. Solo se verificó la vía
  del `timeout` de la transacción. Queda para un entorno Neon aislado (rama de pruebas).
- Ningún caso necesitó un segundo usuario. La pertenencia a otro usuario (404) sigue cubierta solo
  por las pruebas automatizadas, para no crear datos fuera del conjunto de pruebas.

**Estado final de la base**: 1 usuario, 2 cuentas, 13 categorías (ids 1–11, 13 y 16; los saltos de
la secuencia se deben a las inserciones fallidas de M7), 8 movimientos (6 activos), 0 metas,
0 presupuestos, 2 migraciones; ninguna fila de otro usuario. Datos nuevos de T072: «Mascotas»
(inactiva), cinco categorías `[M7]` y los movimientos 7 y 8 (inactivos). Cambios en datos previos:
descripciones de los movimientos 2 y 3, colores de «Varios» y «comida ».

## T073 — M11, usabilidad SC-001 (2026-11-12)

**Resultado: verificación técnica completada; observación con una persona pendiente.**

**Criterio** (`spec.md`, SC-001): «El usuario puede crear una categoría válida en menos de
30 segundos desde que abre la pantalla Categorías». T073 y M11 lo definen como una **observación de
usabilidad, no una garantía de rendimiento**: cronometrar desde abrir `/categorias` hasta ver la
confirmación y anotar las dificultades. No fijan otros umbrales.

**Qué se hizo.** Un recorrido **automatizado por el agente**, no una prueba con personas usuarias.
Usó el formulario real de `/categorias`, la API real (`fetch` nativo, sin simulación) y
`lunarbudget_test`, verificada antes de escribir. Con la pestaña visible:

1. Navegar a `/categorias`.
2. Hacer clic en «Nombre» y escribir «[M11] Suscripciones».
3. Pulsar `Tab` hasta el tipo y elegir «Gasto» con la flecha.
4. Pulsar `Tab` hasta el color y escribir `#0ea5e9`.
5. Pulsar `Tab` dos veces hasta el ícono y escribir `repeat`.
6. Enviar con `Enter`.

Los tiempos salen de la API de rendimiento del navegador, de los tiempos de recursos y de un
observador pasivo del DOM.

| Medición (ms desde el inicio de la navegación) | Valor |
|---|---|
| Página interactiva (`domInteractive`) | 70 ms |
| Carga inicial de la lista (`GET /api/categorias`) | inicio 231 ms, duración 45 ms (lista lista ≈ 0,28 s) |
| `POST /api/categorias` | 18 ms |
| Envío (`Enter`) → confirmación visible | **32 ms** |
| Primer clic → confirmación visible | 11,8 s |
| Navegación → confirmación visible | **28,5 s** |

El tiempo total está dominado por la latencia de las herramientas del agente (unos 10 pasos
automatizados entre la carga y el envío), no por la aplicación. La parte atribuible a la app (carga
de la lista, `POST` y confirmación) suma menos de 0,4 s. Aun con esa sobrecarga, el recorrido
terminó por debajo de 30 s. **No mide** lo que tarda una persona en leer, decidir y escribir.

**Evidencia de la creación real**

- Confirmación visible: «Categoría “[M11] Suscripciones” creada.». La lista pasó de 13 a 14 y la fila
  nueva muestra «Gasto · Activa».
- El formulario se reinició (nombre, tipo y color vacíos; botón «Crear categoría»).
- En la base: una sola fila nueva, `CATId=17`, «[M11] Suscripciones» (19 caracteres), `gasto`,
  `#0ea5e9`, `repeat`, activa, `USUId=1`, igual a lo enviado. Las 13 categorías previas conservan
  la misma huella (`md5`) que al empezar; cuentas y movimientos sin cambios. Totales: 1 usuario,
  2 cuentas, 14 categorías y 8 movimientos.
- Un segundo envío con el mismo nombre, para revisar los errores, respondió **409** sin escribir.

**Revisión de usabilidad y accesibilidad (técnica)**

| Aspecto | Observado | Evaluación |
|---|---|---|
| Etiquetas | Todos los campos tienen `<label>` asociada; el tipo, opciones de radio con descripción («Sueldo, ventas»…); contador 19/50 | ✅ |
| Teclado | Recorrido completo sin ratón tras llegar al nombre; las flechas eligen el tipo; `Enter` envía. El nombre es la parada 7 de `Tab` (tras 6 enlaces de la barra lateral) | ✅ (ver O-5) |
| Errores (envío vacío) | «Escribe un nombre de 1 a 50 caracteres.» y «Elige si la categoría es de ingreso, gasto o ahorro.», en línea con `aria-invalid`; foco en el nombre; ninguna petición | ✅ |
| Errores (duplicado) | 409 «Ya existe la categoría "[M11] Suscripciones" de tipo gasto» junto al nombre; foco en el nombre; valor conservado | ✅ |
| Confirmación | Texto visible en región `aria-live` | ✅ |
| 360 px | Formulario y errores sin desplazamiento horizontal (ancho del documento = 360 px) | ✅ |
| Escritorio | Flujo completo sin problemas | ✅ |

**Observaciones (no son defectos de contrato)**

- **O-4**: tras crear con éxito, el foco queda en `BODY`, porque los campos se deshabilitan durante el
  envío y el formulario se reinicia. Una persona que usa teclado tiene que volver a tabular hasta el
  nombre (7 paradas) para crear otra. Mejora sugerida: devolver el foco al nombre después de la
  confirmación.
- **O-5**: no hay enlace para saltar al contenido; las 6 entradas de la barra lateral preceden al
  formulario. Corresponde al layout compartido (`AppShell`), fuera del alcance de esta feature.

**Pendiente**: que **Andrés** cronometre el flujo (abrir `/categorias` → confirmación de una
categoría válida, con un nombre nuevo, en `lunarbudget_test`) y anote las dificultades. Con eso se
marca T073. La medición técnica no sustituye esa observación.
