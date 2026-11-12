# Feature Specification: Gestión de Categorías

**Feature Branch**: `001-gestion-categorias` (identificador de la feature; no se creó una rama con ese
nombre porque no hay hook de Git registrado. Rama de trabajo real: `feature/aowxkit-adoption`,
verificada con `git branch --show-current` el 2026-11-12)

**Created**: 2026-11-11

**Status**: Approved (2026-11-12). Alineada con la Constitución v1.2.0.

**Input**: User description: "Completar el módulo de Gestión de Categorías de LunarBudget: consultar,
crear, editar y activar/desactivar categorías financieras desde la pantalla /categorias, conservando
el comportamiento de Movimientos, impidiendo administrar categorías de otro usuario sin implementar
autenticación, con estados de carga, vacío y error, y criterios de aceptación verificables."

## Clarifications

### Session 2026-11-11

- Q: ¿Qué valores admite `CATTipo` y cómo se relaciona con `MOVTipo`? → A: `CATTipo` mantiene
  `ingreso`, `gasto` y `ahorro` en minúsculas; `MOVTipo` mantiene `INGRESO`, `GASTO` y `AHORRO`; su
  correspondencia se valida sin distinguir mayúsculas; una categoría con movimientos asociados no
  puede cambiar de tipo.
- Q: ¿Qué política de duplicados aplica a las categorías? → A: el nombre es único por usuario y tipo,
  incluidas las categorías inactivas; la comparación ignora mayúsculas/minúsculas y espacios al inicio
  y al final; los duplicados históricos se identifican sin modificarlos ni eliminarlos
  automáticamente.
- Q: ¿Qué ocurre al desactivar una categoría usada por movimientos? → A: se permite; los movimientos
  existentes conservan su asociación; al editar un movimiento puede conservarse la categoría inactiva
  que ya tenía, pero no asignársele una categoría inactiva diferente ni usarla en movimientos nuevos.
- Q: ¿Cómo se determina el usuario actual sin autenticación? → A: el backend lo determina mediante
  configuración del servidor y el cliente no puede escoger arbitrariamente el `USUId`. Es una solución
  temporal del MVP personal y no es autenticación ni aislamiento seguro entre usuarios; cualquier
  exposición multiusuario futura requiere autenticación y autorización reales.

### Session 2026-11-12

- Q: Cuando un dato existente ya incumple una regla nueva (duplicado histórico, movimiento cuyo tipo
  no corresponde al de su categoría o categoría con `CATTipo` fuera de los tres valores), ¿la regla se
  valida en cualquier edición o solo cuando cambian los campos involucrados? → A: solo cuando cambian
  realmente los campos involucrados, comparando contra los valores persistidos en la base de datos y
  no contra la mera presencia de propiedades en el payload. Precisiones: (1) una edición que no
  modifica los campos involucrados se permite aunque el registro tenga inconsistencias históricas;
  (2) si cambia el tipo o la categoría de un movimiento, se aplican las reglas actuales de
  correspondencia, pertenencia y estado activo; (3) conservar una categoría inactiva previamente
  asociada no se considera una nueva asignación; (4) si cambia el nombre o el tipo de una categoría,
  se aplican sus validaciones, y se mantiene la prohibición de cambiar el tipo de categorías con
  movimientos asociados; (5) los registros históricos inconsistentes no se modifican ni normalizan
  automáticamente.
- Precisiones aprobadas de Q5 (antes del plan, reemplazan las interpretaciones provisionales):
  (a) si cambia `MOVTipo` o `CATId`, la categoría resultante debe estar activa, corresponder al tipo
  del movimiento y pertenecer al usuario configurado; si ambos permanecen sin cambios, se puede
  conservar la categoría inactiva histórica; (b) la pertenencia del movimiento al usuario configurado
  se verifica siempre; las nuevas asignaciones de cuenta o categoría requieren validación de
  pertenencia; preservar relaciones históricas sin alterarlas no implica corregirlas automáticamente.

### Revisión del plan 2026-11-12 (decisiones de Andrés)

- D3 (rechazo de la propuesta de arranque tolerante): la API NO DEBE arrancar si `CURRENT_USER_ID`
  falta, tiene formato inválido o referencia un usuario inexistente; DEBE fallar de forma explícita y
  distinguir el error de configuración del error de conexión a la base de datos (FR-013).
- Duplicados históricos: se identifican mediante un diagnóstico independiente de solo lectura; el
  contrato de la consulta de categorías no incorpora campos de duplicados (FR-025).
- **Ampliación de alcance**: la desactivación de movimientos (`PATCH /api/movimientos/:id/desactivar`)
  también valida que el movimiento pertenezca al usuario configurado (FR-024, US5-11). Antes de esta
  revisión quedaba fuera de FR-024.
- Compatibilidad en Movimientos: en edición, el selector incluye la categoría actual aunque esté
  inactiva o no corresponda al tipo (registro histórico), para poder conservarla (FR-023, FR-026).

### Correcciones tras `/speckit-analyze` 2026-11-12 (decisiones de Andrés)

- C1: al editar un movimiento o una categoría, la escritura incluye solo los campos que cambian
  respecto de lo persistido; `CATId` y `CUEId` sin cambios no forman parte de la actualización
  (FR-026).
- H1: el aviso previo al cambio de tipo de una categoría es una advertencia general (no contextual),
  porque el frontend no recibe cuántos movimientos tiene cada categoría; la validación real la hace
  el backend (US3-7).

### Resolución normativa: Constitución v1.2.0 (2026-11-12)

- La enmienda 1.2.0 del Principio V resolvió C1: las validaciones de estado activo y pertenencia de
  cuentas y categorías se aplican cuando la operación asigna o modifica la referencia; conservar sin
  cambios una referencia histórica que la escritura no incluye no es una nueva asignación; la
  pertenencia del propio registro se valida siempre; si cambia `MOVTipo` o `CATId`, la categoría
  resultante cumple pertenencia, estado activo y correspondencia; las referencias históricas no se
  corrigen automáticamente. FR-022, FR-024 y FR-026 quedan alineados con la norma sin cambios.
- La misma enmienda cerró DA-03 fijando Vitest como herramienta de pruebas (Principio VII).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mis categorías (Priority: P1)

Como usuario de LunarBudget, quiero ver en la pantalla Categorías todas mis categorías, con su nombre,
tipo y estado (activa o inactiva), para saber con qué clasificaciones cuento al registrar movimientos.

**Why this priority**: es la base de las demás historias. Sin la lista no hay dónde crear, editar ni
cambiar el estado, y hoy la pantalla solo muestra el encabezado.

**Independent Test**: con categorías existentes del usuario actual, abrir Categorías y comprobar que
aparecen todas con nombre, tipo y estado, y que se muestran los estados de carga, lista vacía y error.

**Acceptance Scenarios**:

1. **Given** el usuario actual tiene categorías activas e inactivas, **When** abre la pantalla
   Categorías, **Then** ve cada categoría con su nombre, tipo (Ingreso, Gasto o Ahorro) y estado,
   ordenadas alfabéticamente por nombre, y el estado se identifica con texto (no solo con color).
2. **Given** la información aún se está obteniendo, **When** la pantalla se carga, **Then** se
   muestra un indicador de carga y no se muestra el mensaje de lista vacía.
3. **Given** el usuario actual no tiene categorías, **When** abre la pantalla, **Then** ve un mensaje
   de lista vacía que lo invita a crear su primera categoría.
4. **Given** la consulta falla, **When** abre la pantalla, **Then** ve un mensaje de error
   comprensible y puede reintentar la consulta sin recargar toda la aplicación.
5. **Given** existen categorías de otro usuario, **When** se consulta la lista, **Then** solo se
   muestran las del usuario actual definido en la configuración del servidor (FR-013).
6. **Given** existen duplicados históricos (mismo tipo y mismo nombre normalizado), **When** se
   consulta la lista, **Then** todos siguen visibles y sin cambios; **When** se ejecuta el
   diagnóstico de duplicados, **Then** quedan identificados y ningún registro cambia (FR-025).

---

### User Story 2 - Crear una categoría (Priority: P1)

Como usuario, quiero crear una categoría indicando nombre, tipo y, opcionalmente, color e ícono, para
clasificar mis ingresos, gastos y ahorros según mi realidad.

**Why this priority**: es el principal valor nuevo del módulo; hoy solo se pueden obtener categorías
mediante el seed.

**Independent Test**: crear una categoría válida desde la pantalla y comprobar que aparece activa en
la lista y está disponible al registrar un movimiento nuevo del tipo correspondiente.

**Acceptance Scenarios**:

1. **Given** el formulario de creación con nombre válido y tipo `ingreso`, `gasto` o `ahorro`,
   **When** el usuario guarda, **Then** la categoría se crea activa, pertenece al usuario actual
   definido por el servidor, aparece en la lista y se muestra un mensaje de confirmación.
2. **Given** el nombre está vacío o solo contiene espacios, **When** el usuario intenta guardar,
   **Then** se muestra un mensaje de validación junto al campo y no se crea nada.
3. **Given** un tipo distinto de `ingreso`, `gasto` o `ahorro`, **When** se intenta guardar,
   **Then** la operación se rechaza con un mensaje de validación y no se crea nada.
4. **Given** un color con formato inválido, **When** se intenta guardar, **Then** se muestra un
   mensaje de validación y no se crea nada.
5. **Given** ya existe una categoría del usuario, activa o inactiva, del mismo tipo y con el mismo
   nombre (ignorando mayúsculas/minúsculas y espacios al inicio y al final), **When** se intenta
   crear " comida " como `gasto` habiendo una "Comida" de tipo `gasto`, **Then** se rechaza con un
   mensaje que indica que ya existe y, si la existente está inactiva, sugiere reactivarla.
6. **Given** existe "Ahorro" de tipo `ahorro`, **When** se crea "Ahorro" de tipo `ingreso`,
   **Then** se permite, porque la unicidad es por tipo.
7. **Given** el guardado falla por un error del servidor, **When** el usuario guarda, **Then** ve un
   mensaje de error sin detalles técnicos y conserva los datos que escribió para reintentar.
8. **Given** una categoría recién creada de tipo `gasto`, **When** el usuario registra un movimiento
   nuevo de tipo Gasto, **Then** la categoría aparece entre las opciones; para un movimiento de tipo
   Ingreso o Ahorro, no aparece.
9. **Given** un guardado en curso, **When** el usuario vuelve a pulsar guardar, **Then** no se crea
   una segunda categoría.
10. **Given** el cliente envía un identificador de usuario al crear, **When** se procesa la
    petición, **Then** la categoría se asigna siempre al usuario actual definido por el servidor,
    nunca al que indica el cliente.

---

### User Story 3 - Editar una categoría (Priority: P2)

Como usuario, quiero corregir el nombre, el color, el ícono y, si todavía no tiene movimientos, el
tipo de una categoría, para mantener mi catálogo ordenado sin perder su historial.

**Why this priority**: es necesaria para mantener el catálogo, pero el módulo ya aporta valor con la
consulta y la creación.

**Independent Test**: editar el nombre de una categoría con movimientos asociados y comprobar que la
lista y el historial de movimientos muestran el nuevo nombre, sin otros cambios en esos movimientos.

**Acceptance Scenarios**:

1. **Given** una categoría del usuario actual, **When** cambia el nombre, el color o el ícono con
   valores válidos y guarda, **Then** los cambios se guardan, la lista se actualiza y se muestra un
   mensaje de confirmación.
2. **Given** la categoría tiene movimientos asociados, **When** se cambia su nombre, **Then** esos
   movimientos muestran el nuevo nombre y ningún otro dato de ellos cambia.
3. **Given** datos inválidos (mismas reglas que en la creación), **When** se intenta guardar,
   **Then** se muestran mensajes de validación y la categoría no cambia.
4. **Given** se cambia el nombre a uno que ya usa otra categoría del mismo usuario y tipo
   (normalizado), **When** se guarda, **Then** se rechaza por duplicado y la categoría no cambia.
5. **Given** el usuario está editando, **When** cancela, **Then** la categoría queda como estaba.
6. **Given** la categoría ya no existe o pertenece a otro usuario, **When** se intenta guardar,
   **Then** la operación se rechaza como "no encontrada", sin revelar datos, y no se modifica nada.
7. **Given** la categoría tiene al menos un movimiento asociado (activo o desactivado), **When** se
   intenta cambiar su tipo, **Then** se rechaza con un mensaje que explica que su tipo no puede
   cambiar porque tiene movimientos. Antes de intentarlo, la UI DEBERÍA mostrar junto al campo de
   tipo una advertencia general: las categorías con movimientos asociados no permiten cambiar su
   tipo. La advertencia no depende de los datos de la categoría (el frontend no recibe cuántos
   movimientos tiene); la validación real la hace el backend.
8. **Given** la categoría no tiene movimientos asociados, **When** se cambia su tipo a otro valor
   válido sin generar un duplicado, **Then** el cambio se guarda.
9. **Given** una categoría que forma parte de un duplicado histórico, **When** se cambia solo su
   color o su ícono, **Then** el cambio se guarda sin exigir resolver el duplicado y ninguna de las
   categorías duplicadas cambia en nada más (FR-026).
10. **Given** una categoría que forma parte de un duplicado histórico, **When** se cambia su nombre o
    su tipo, **Then** se aplica la regla de unicidad: si el resultado sigue coincidiendo con otra
    categoría del mismo usuario y tipo (normalizado), se rechaza por duplicado y no cambia nada; si no
    coincide, se guarda (FR-006, FR-026).
11. **Given** una categoría con un `CATTipo` fuera de los tres valores, **When** se edita su nombre,
    color o ícono sin cambiar el tipo, **Then** el cambio se guarda y el tipo se conserva tal cual;
    **When** se intenta cambiar el tipo, **Then** el nuevo tipo debe ser `ingreso`, `gasto` o `ahorro`
    y se aplica el escenario 7 si tiene movimientos asociados.
12. **Given** el formulario reenvía nombre y tipo con los mismos valores que ya están guardados (el
    nombre comparado tras recortar espacios), **When** se guarda un cambio de color, **Then** no se
    considera un cambio de nombre ni de tipo y no se evalúan sus reglas (FR-026).

---

### User Story 4 - Activar y desactivar una categoría (Priority: P2)

Como usuario, quiero desactivar las categorías que ya no uso, sin borrarlas, para que no aparezcan al
registrar movimientos nuevos pero sigan visibles en mi historial; y quiero poder reactivarlas.

**Why this priority**: protege la integridad del historial y completa el ciclo de vida de la
categoría. Depende de la lista (US1).

**Independent Test**: desactivar una categoría con movimientos, comprobar que sigue en la lista
marcada como inactiva, que no se ofrece al crear un movimiento y que los movimientos existentes la
siguen mostrando; luego reactivarla y comprobar que vuelve a estar disponible.

**Acceptance Scenarios**:

1. **Given** una categoría activa, **When** el usuario elige desactivarla, **Then** se le pide
   confirmación antes de aplicar el cambio.
2. **Given** el usuario confirma, **When** se completa la operación, **Then** la categoría sigue en la
   lista marcada como inactiva y se muestra un mensaje de confirmación.
3. **Given** el usuario cancela la confirmación, **When** se cierra el aviso, **Then** la categoría no
   cambia.
4. **Given** una categoría inactiva, **When** el usuario registra un movimiento nuevo, **Then** esa
   categoría no aparece entre las opciones y el sistema rechaza cualquier intento de usarla.
5. **Given** una categoría con movimientos asociados, **When** se desactiva, **Then** la operación
   se permite y esos movimientos conservan la categoría y la siguen mostrando en el historial.
6. **Given** una categoría inactiva, **When** el usuario la activa, **Then** queda activa, vuelve a
   estar disponible para movimientos nuevos del tipo correspondiente y se muestra un mensaje de
   confirmación.
7. **Given** una categoría que ya tiene el estado solicitado, **When** se repite la operación,
   **Then** se informa que ya se encontraba en ese estado y no se modifica nada.

---

### User Story 5 - Usar categorías de forma coherente en Movimientos (Priority: P2)

Como usuario, quiero que al registrar o editar un movimiento solo pueda elegir categorías activas del
tipo que corresponde, y que los movimientos con una categoría ya inactiva puedan seguir editándose,
para que mis datos sean coherentes sin bloquear el historial.

**Why this priority**: es la consecuencia directa de las decisiones de tipo e inactividad sobre el
módulo Movimientos, que ya existe. Sin esta historia, desactivar categorías seguiría bloqueando la
edición de movimientos (comportamiento actual).

**Independent Test**: con categorías de los tres tipos, una de ellas inactiva y con movimientos,
registrar movimientos de cada tipo y editar un movimiento cuya categoría está inactiva, comprobando
las opciones ofrecidas y los rechazos.

**Acceptance Scenarios**:

1. **Given** el formulario de nuevo movimiento con tipo Gasto, **When** el usuario abre el selector
   de categoría, **Then** solo ve categorías activas de tipo `gasto`, además de "Sin categoría".
2. **Given** se seleccionó una categoría y el usuario cambia el tipo del movimiento a uno que no
   corresponde, **When** se aplica el cambio de tipo, **Then** la categoría seleccionada se limpia y
   se informa al usuario.
3. **Given** una petición para crear un movimiento de tipo `INGRESO` con una categoría de tipo
   `gasto`, **When** se procesa, **Then** se rechaza indicando que la categoría no corresponde al
   tipo del movimiento, y no se crea nada.
4. **Given** un movimiento existente cuya categoría está inactiva, **When** el usuario lo edita
   (por ejemplo, la descripción) sin cambiar la categoría, **Then** el selector muestra esa categoría
   marcada como inactiva y el cambio se guarda conservándola.
5. **Given** un movimiento existente, **When** se intenta asignarle una categoría inactiva distinta
   de la que ya tenía, **Then** se rechaza y no se modifica nada.
6. **Given** un movimiento sin categoría, **When** se edita, **Then** puede seguir sin categoría
   (comportamiento actual).
7. **Given** una cuenta o categoría que no pertenece al usuario actual definido por el servidor,
   **When** se intenta crear un movimiento con ella, o editar un movimiento cambiándole la cuenta o la
   categoría por ella, **Then** se rechaza (FR-024).
8. **Given** un movimiento histórico cuyo tipo no corresponde al de su categoría, **When** se edita
   (por ejemplo, la descripción o el monto) y el tipo y la categoría enviados son iguales a los
   guardados, **Then** el cambio se guarda y la inconsistencia se conserva sin corregirse (FR-026).
9. **Given** un movimiento existente, **When** se cambia su tipo o su categoría respecto de lo
   guardado, **Then** la categoría resultante debe estar activa, corresponder al tipo resultante y
   pertenecer al usuario actual (también si solo cambió el tipo y se mantuvo una categoría
   inactiva); si alguna regla no se cumple, se rechaza y no se modifica nada (FR-021, FR-022,
   FR-024, FR-026).
10. **Given** un movimiento de otro usuario, **When** se intenta editar, **Then** se rechaza siempre,
    cambie o no algún campo (FR-024).
11. **Given** un movimiento de otro usuario, **When** se intenta desactivar, **Then** se rechaza como
    "no encontrado" y no se modifica nada; desactivar un movimiento propio sigue funcionando como hoy
    (FR-024, ampliación de alcance 2026-11-12).
12. **Given** un movimiento histórico cuya categoría no corresponde a su tipo, **When** el usuario lo
    edita, **Then** el selector incluye esa categoría (marcada) para poder conservarla (FR-023).

---

### Edge Cases

- El nombre tiene espacios al inicio o al final: se recortan antes de validar, comparar y guardar.
- Nombres que solo difieren en mayúsculas/minúsculas o en espacios al inicio y al final cuentan como
  el mismo nombre. Las tildes y los espacios internos sí se distinguen: "Café" ≠ "Cafe".
- El nombre supera la longitud máxima: se rechaza con un mensaje que indica el límite.
- Hay duplicados históricos en la base (posibles por ejecuciones repetidas del seed; no verificado):
  se muestran sin cambios y se identifican con el diagnóstico de solo lectura (FR-025); nunca se
  fusionan, renombran ni eliminan automáticamente.
- Editar una categoría que forma parte de un duplicado histórico: se permite si no cambia el nombre
  ni el tipo; si cambia alguno, se aplica la unicidad (FR-026, US3-9/10).
- Hay movimientos históricos cuyo tipo no corresponde al de su categoría (no verificado): no se
  modifican automáticamente; pueden editarse mientras no cambien el tipo ni la categoría; si cambia
  alguno, se aplica la correspondencia (FR-026, US5-8/9).
- Existe una categoría con un `CATTipo` fuera de los tres valores (no verificado): se muestra tal
  cual, no se ofrece para movimientos nuevos y puede editarse sin cambiar el tipo; si se cambia el
  tipo, debe ser uno de los tres valores válidos (FR-026, US3-11).
- El formulario reenvía todos los campos aunque no hayan cambiado: el servidor compara contra los
  valores persistidos, no contra la presencia de las propiedades en el payload (FR-026).
- El usuario no tiene categorías activas del tipo elegido: el registro de movimientos sigue
  permitiendo "Sin categoría", como hoy.
- Una categoría se desactiva mientras el formulario de Movimientos está abierto con esa opción
  seleccionada: el guardado de un movimiento nuevo se rechaza por categoría inactiva y el usuario
  puede elegir otra.
- **Comportamiento actual que esta feature cambia**: hoy, al editar un movimiento con categoría
  inactiva, el guardado reenvía su identificador y se rechaza por categoría inactiva. Con FR-022, la
  categoría actual puede conservarse.
- La configuración del usuario actual en el servidor falta, tiene formato inválido o apunta a un
  usuario inexistente: la API no arranca y muestra un error de configuración explícito; nunca se usa
  otro usuario por omisión. Si al arrancar no se puede conectar a la base de datos, la API tampoco
  arranca y el mensaje indica que es un error de conexión, no de configuración (FR-013, decisión D3).
- El usuario que muestra hoy la interfaz (el primero de la lista de usuarios, en el Dashboard y en el
  formulario de Movimientos) podría no coincidir con el usuario configurado: el servidor siempre
  manda; la interfaz no debe presentar otro usuario como el actual en las pantallas que esta feature
  toca.
- Dos creaciones o ediciones simultáneas con el mismo nombre y tipo: la base no tiene una restricción
  de unicidad y no habrá cambio de esquema. La aplicación serializa esas operaciones (detalle y
  límites en el plan): una se guarda y la otra se rechaza como duplicado o como conflicto
  reintentable. Las escrituras que no pasen por la API (seed, herramientas manuales) no quedan
  protegidas.
- Las categorías tienen presupuestos mensuales asociados: desactivar no los borra ni los modifica
  (Presupuestos está fuera de alcance).
- Dos pestañas abiertas cambian la misma categoría: prevalece la última operación confirmada y la
  lista refleja el estado real al recargar.
- El servicio no está disponible al crear, editar o cambiar el estado: se muestra un error y no se
  presenta el cambio como aplicado.
- Pantalla angosta (móvil): la lista y los formularios se pueden usar sin desplazamiento horizontal.
  La navegación lateral oculta en móvil es un problema existente fuera de alcance.

## Requirements *(mandatory)*

### Functional Requirements

**Consulta**

- **FR-001**: El sistema DEBE mostrar en la pantalla Categorías todas las categorías del usuario
  actual, activas e inactivas, con nombre, tipo y estado, ordenadas alfabéticamente por nombre.
- **FR-002**: El estado de cada categoría DEBE indicarse con texto visible, sin depender solo del
  color. Si la categoría tiene color, DEBE mostrarse una muestra de ese color.
- **FR-003**: La pantalla DEBE mostrar estados diferenciados de carga, lista vacía y error de
  consulta. El estado de error DEBE ofrecer una acción para reintentar.

**Creación y edición**

- **FR-004**: El usuario DEBE poder crear una categoría con nombre (obligatorio), tipo (obligatorio),
  color (opcional) e ícono (opcional). Una categoría nueva queda activa y pertenece siempre al usuario
  actual determinado por el servidor (FR-013).
- **FR-005**: El sistema DEBE validar, tanto al crear como al editar:
  - nombre recortado no vacío, con un máximo de 50 caracteres;
  - tipo exactamente igual a `ingreso`, `gasto` o `ahorro`, en minúsculas (los mismos valores que ya
    existen en los datos);
  - color, si se indica, en formato hexadecimal `#RRGGBB`;
  - ícono, si se indica, como texto de hasta 50 caracteres.
  El nombre se guarda recortado. Al editar, cada regla se aplica solo a los campos que cambian
  respecto de los valores persistidos (FR-026); un valor histórico que no cambia no se revalida.
- **FR-006**: El nombre DEBE ser único por usuario y tipo, considerando también las categorías
  inactivas. La comparación ignora mayúsculas/minúsculas y espacios al inicio y al final. Crear o
  editar una categoría que generaría un duplicado DEBE rechazarse con un mensaje que identifique la
  categoría existente y, si esta está inactiva, sugiera reactivarla. Mismo nombre con distinto tipo
  está permitido. Al editar, la unicidad se evalúa solo si cambia el nombre o el tipo (FR-026), y la
  propia categoría editada no cuenta como duplicado de sí misma.
- **FR-007**: El usuario DEBE poder editar el nombre, el color y el ícono de una categoría propia, y
  su tipo solo si la categoría no tiene ningún movimiento asociado. Se considera movimiento asociado
  cualquier movimiento que la referencie, esté activo o desactivado. No son editables el
  identificador, el propietario ni la fecha de creación. El estado solo cambia mediante activar o
  desactivar (FR-008).

**Estado**

- **FR-008**: El usuario DEBE poder desactivar y activar categorías propias, sin eliminarlas
  físicamente nunca. Desactivar DEBE pedir confirmación previa.
- **FR-009**: Las categorías inactivas NO DEBEN ofrecerse ni aceptarse para movimientos nuevos.
- **FR-010**: Desactivar o editar una categoría NO DEBE modificar los movimientos ni los
  presupuestos que la usan. El historial de movimientos DEBE seguir mostrando su nombre actual.
- **FR-011**: Desactivar una categoría con movimientos asociados DEBE permitirse; esos movimientos
  conservan su asociación.
- **FR-012**: Repetir una activación o desactivación sobre una categoría que ya tiene ese estado
  DEBE informarse como tal y no modificar nada.

**Usuario actual y pertenencia**

- **FR-013**: El servidor DEBE determinar el usuario actual a partir de su configuración. El cliente
  NO DEBE poder escoger el usuario: cualquier identificador de usuario que envíe para Categorías se
  ignora y nunca reemplaza al configurado. Las operaciones de consulta, creación, edición, activación
  y desactivación solo actúan sobre categorías del usuario actual; un intento sobre una categoría de
  otro usuario DEBE responderse como "no encontrada", sin revelar sus datos. Al iniciar, la API DEBE
  verificar la configuración: si falta, tiene formato inválido o referencia un usuario inexistente,
  NO DEBE arrancar y DEBE informar un error de configuración explícito; si no puede consultar la
  base de datos para verificarla, NO DEBE arrancar y DEBE informar un error de conexión, distinto
  del de configuración. Nunca se usa un usuario por omisión ni se muestra el valor configurado.
- **FR-014**: Esta solución NO DEBE presentarse ni documentarse como autenticación ni como
  aislamiento seguro entre usuarios. Es temporal para el MVP personal; cualquier exposición
  multiusuario futura requiere autenticación y autorización reales. Los mensajes de error NO DEBEN
  mostrar detalles internos (Constitución VIII).

**Experiencia de uso**

- **FR-015**: Cada operación exitosa DEBE mostrar un mensaje de confirmación; cada validación fallida
  DEBE indicar el campo y el motivo; cada error DEBE mostrar un mensaje comprensible.
- **FR-016**: Mientras una operación está en curso, sus acciones DEBEN quedar deshabilitadas para
  evitar envíos duplicados, y el formulario DEBE conservar los datos si la operación falla.
- **FR-017**: La pantalla Categorías DEBE poder usarse en anchos desde 360 px sin desplazamiento
  horizontal.

**Compatibilidad**

- **FR-018**: El catálogo de categorías que consume Movimientos DEBE conservar los mismos campos, con
  los mismos nombres y formatos. Los cambios de comportamiento (filtrar por usuario actual y por tipo)
  son cambios de contrato declarados (ver "Contract Impact").
- **FR-019**: Los cambios hechos en Categorías DEBEN reflejarse en Movimientos la próxima vez que se
  carguen sus opciones o su historial.
- **FR-020**: La funcionalidad DEBE implementarse sin cambios en el esquema de la base de datos y sin
  modificar ni eliminar automáticamente datos existentes.

**Impacto en Movimientos** (alcance ampliado por las aclaraciones de la sesión 2026-11-11)

- **FR-021**: Al crear un movimiento con categoría, el tipo de la categoría DEBE corresponder al tipo
  del movimiento, sin distinguir mayúsculas: `ingreso`↔`INGRESO`, `gasto`↔`GASTO`,
  `ahorro`↔`AHORRO`. Si no corresponde, DEBE rechazarse con un mensaje claro. La misma regla aplica
  al editar, según FR-026.
- **FR-022**: Al editar un movimiento, DEBE poder conservarse la categoría que ya tenía aunque esté
  inactiva. NO DEBE poder asignarse una categoría inactiva distinta de la actual, y las categorías
  inactivas no se usan en movimientos nuevos (FR-009).
- **FR-023**: Los selectores de categoría de Movimientos DEBEN ofrecer solo categorías activas del
  usuario actual cuyo tipo corresponda al tipo del movimiento seleccionado, además de "Sin
  categoría". En edición, además, DEBEN incluir la categoría actual del movimiento aunque esté
  inactiva, marcada como "(inactiva)", o aunque no corresponda a su tipo por ser un registro
  histórico, para poder conservarla (FR-026). Si el usuario cambia el tipo del movimiento y la
  categoría seleccionada deja de corresponder, la selección DEBE limpiarse con un aviso.
- **FR-024**: Las operaciones de crear, editar y desactivar movimientos DEBEN validar que el propio
  movimiento (al editar o desactivar), la cuenta y la categoría pertenecen al usuario actual
  determinado por el servidor (Constitución V, aclaración Q4). La pertenencia del propio movimiento
  se valida siempre; un movimiento de otro usuario se responde como "no encontrado". Las nuevas
  asignaciones de cuenta o categoría (y la categoría resultante cuando cambia `MOVTipo`) requieren
  validación de pertenencia (FR-026). Preservar relaciones históricas sin alterarlas no implica
  corregirlas automáticamente. El cliente no puede escoger otro usuario: al crear, `USUId` pasa a
  ser opcional; si se envía y no coincide con el usuario configurado, DEBE rechazarse como petición
  inválida; si coincide o se omite, se usa el configurado (compatibilidad con clientes que todavía
  lo envían). Al editar, el `USUId` del cuerpo se ignora. La desactivación se incorporó a este
  requisito en la revisión del plan del 2026-11-12.
- **FR-025**: Los duplicados históricos (mismo usuario, mismo tipo y mismo nombre normalizado) DEBEN
  identificarse sin modificarlos, fusionarlos ni eliminarlos, mediante un diagnóstico independiente
  de solo lectura. La consulta de categorías que consume Movimientos NO DEBE incorporar campos de
  diagnóstico.
- **FR-026**: Al editar una categoría o un movimiento, las reglas de consistencia de datos se
  validan solo cuando la edición cambia realmente los campos involucrados. "Cambiar" se determina
  comparando el valor recibido, tras normalizarlo como se guardaría (por ejemplo, el nombre
  recortado), con el valor persistido en la base de datos; la mera presencia de la propiedad en el
  payload no cuenta como cambio. En concreto (aclaración Q5):
  - Una edición que no modifica los campos involucrados DEBE permitirse aunque el registro tenga
    inconsistencias históricas (categoría que forma parte de un duplicado histórico, movimiento cuyo
    tipo no corresponde al de su categoría, categoría con `CATTipo` fuera de los tres valores, u otro
    valor histórico que no cumpla FR-005).
  - **Categorías**: si cambia el nombre o el tipo, DEBEN aplicarse las validaciones de FR-005 y la
    unicidad de FR-006 sobre el resultado. Se mantiene la prohibición de cambiar el tipo de una
    categoría con movimientos asociados (FR-007).
  - **Movimientos**: si cambia `MOVTipo` o `CATId`, la categoría resultante (si no es "Sin
    categoría") DEBE estar activa, corresponder al tipo resultante del movimiento (FR-021) y
    pertenecer al usuario configurado (FR-024); esto aplica también cuando solo cambia el tipo y se
    mantiene la categoría. Si ambos permanecen sin cambios, se puede conservar la categoría inactiva
    histórica (FR-022). Si cambia `CUEId`, la nueva cuenta DEBE pertenecer al usuario configurado.
    La pertenencia del propio movimiento se verifica siempre.
  - **Escritura**: la actualización DEBE incluir solo los campos que cambian; `CATId` y `CUEId` que
    no cambian NO DEBEN incluirse en los datos de la actualización (decisión C1).
  - Los registros históricos inconsistentes NO DEBEN modificarse ni normalizarse automáticamente,
    ni al editarlos ni en ningún otro momento (FR-020).

### Key Entities *(include if feature involves data)*

- **Categoría** (`Categoria` / tabla `WLB_CATEGORIA`): clasificación financiera del usuario.
  Atributos existentes, sin cambios: identificador `CATId`, nombre `CATNombre`, tipo `CATTipo`
  (`ingreso` | `gasto` | `ahorro`), color `CATColor` (opcional, `#RRGGBB`), ícono `CATIcono`
  (opcional, texto; el seed usa identificadores como `wallet` o `piggy-bank`), estado `CATActiva`
  (activa por omisión), fecha de creación `CATCreadoEn` y propietario `USUId`.
  - Regla de identidad: (`USUId`, `CATTipo`, nombre normalizado) es único para las altas y
    ediciones nuevas, validado por la aplicación, no por el esquema.
  - Regla de ciclo de vida: activa ⇄ inactiva; nunca se borra. `CATTipo` queda fijo en cuanto la
    categoría tiene al menos un movimiento asociado.
- **Usuario** (`Usuario`): propietario de las categorías. El "usuario actual" lo fija la
  configuración del servidor (temporal; no es autenticación).
- **Movimiento** (`Movimiento`): puede referenciar cero o una categoría (`CATId` opcional) y tiene un
  tipo `MOVTipo` (`INGRESO` | `GASTO` | `AHORRO`) que debe corresponder al `CATTipo` de su categoría.
- **Presupuesto mensual** (`PresupuestoMensual`): referencia obligatoriamente una categoría. Solo se
  menciona por la restricción de no borrar categorías.

### Contract Impact *(Constitución III y IX)*

- **Consulta de categorías (existente)**: hoy devuelve `{ success, data: Categoria[] }` sin `message`,
  con las categorías de **todos** los usuarios, ordenadas por `CATNombre`; la usan
  `CreateMovementForm` y `MovementsTable` a través del servicio de categorías. **Cambio de contrato**:
  pasará a devolver solo las del usuario actual configurado. Los campos se mantienen; agregar
  `message` (DA-05) es aditivo. No se agregan campos de duplicados (FR-025).
- **Diagnóstico de duplicados (nuevo, solo lectura)**: operación independiente que devuelve los
  grupos de duplicados históricos del usuario actual; no la consume Movimientos (FR-025).
- **Operaciones nuevas de categorías**: crear, editar, desactivar y activar, con el patrón de respuesta
  de Movimientos `{ success, message, data }` y errores 400 (validación), 404 (no existe o es de otro
  usuario), 409 (duplicado, conflicto de estado o cambio de tipo con movimientos) y 500 (genérico, sin
  detalles internos). El cuerpo no define el propietario. Las rutas y métodos exactos se fijan en el
  plan siguiendo el patrón de Movimientos.
- **Creación y edición de movimientos (existentes)**: **cambio de contrato**.
  - Se agregan rechazos nuevos: la categoría no corresponde al tipo del movimiento, y la cuenta o la
    categoría no pertenecen al usuario actual.
  - Se relaja una regla: al editar, se acepta conservar la categoría inactiva actual (hoy se rechaza
    con 409).
  - Las validaciones de edición se evalúan contra los valores persistidos: reenviar `MOVTipo` o
    `CATId` sin cambios no dispara las reglas de correspondencia ni de estado activo (FR-026).
  - `USUId` deja de ser obligatorio al crear: si se envía distinto del configurado → 400; si
    coincide o se omite → se usa el configurado (FR-024). Al editar se sigue ignorando.
  - Un movimiento de otro usuario responde 404 al editarlo.
- **Desactivación de movimientos (existente)**: **cambio de contrato** por ampliación de alcance: un
  movimiento de otro usuario responde 404 (FR-024, US5-11). El resto no cambia.
- **Edición de categorías (nueva)**: reenviar `CATNombre` o `CATTipo` con los valores ya guardados no
  dispara la unicidad ni la validación de tipo (FR-026).
- **Arranque de la API**: no arranca si la configuración del usuario actual es inválida o si no puede
  verificarla en la base de datos (FR-013, D3). Afecta a todos los endpoints, incluidos los que esta
  feature no modifica.
- **Consulta de movimientos, cuentas y usuarios (existentes)**: no cambian en esta feature. Siguen sin
  filtrar por usuario; queda como riesgo residual registrado en el plan.
- **Ejemplo de datos de creación de categoría**:

  ```json
  { "CATNombre": "Mascotas", "CATTipo": "gasto", "CATColor": "#f97316", "CATIcono": null }
  ```

  Respuesta esperada:

  ```json
  {
    "success": true,
    "message": "Categoría creada correctamente",
    "data": {
      "CATId": 10, "CATNombre": "Mascotas", "CATTipo": "gasto", "CATColor": "#f97316",
      "CATIcono": null, "CATActiva": true, "CATCreadoEn": "2026-11-11T18:30:00.000Z", "USUId": 1
    }
  }
  ```

- **Ejemplo de duplicado**: crear `{ "CATNombre": " comida ", "CATTipo": "gasto" }` cuando existe
  "Comida" de tipo `gasto` → `success: false`, un mensaje que identifica la existente y `data: null`.
- **Ejemplo de desactivación** (respuesta): igual estructura con `"CATActiva": false` y un mensaje
  de confirmación. Si la categoría ya está inactiva: `success: false`, sin cambios (FR-012).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede crear una categoría válida en menos de 30 segundos desde que abre la
  pantalla Categorías.
- **SC-002**: El 100 % de las categorías desactivadas deja de ofrecerse para movimientos nuevos, y 0
  movimientos existentes cambian de datos como consecuencia de desactivar o editar una categoría
  (comparación antes y después).
- **SC-003**: El 100 % de los envíos inválidos de los escenarios de aceptación (incluidos duplicados
  y cambio de tipo con movimientos) muestra un mensaje que identifica el motivo y no crea ni
  modifica datos.
- **SC-004**: En los casos de verificación, 0 operaciones de escritura (crear, editar, activar o
  desactivar) tienen éxito sobre categorías, cuentas o movimientos de otro usuario, 0 consultas de
  Categorías (lista y diagnóstico) devuelven categorías de otro usuario, y 0 categorías nuevas
  quedan asignadas a un usuario distinto del configurado. Las consultas GET de Movimientos, Cuentas,
  Usuarios, Metas y Presupuestos quedan fuera de este criterio (riesgo residual R-6 del plan).
- **SC-005**: En los tres estados (carga, lista vacía y error) la pantalla muestra una indicación
  específica; nunca queda en blanco.
- **SC-006**: Los flujos existentes de Movimientos (registrar, editar y desactivar) siguen funcionando
  en una verificación de regresión, con los únicos cambios definidos en FR-021 a FR-024 y FR-026.
- **SC-007**: Todas las operaciones del módulo se pueden completar en una pantalla de 360 px de
  ancho.
- **SC-008**: El 100 % de los movimientos creados con categoría después de esta feature tiene una
  categoría cuyo tipo corresponde al suyo.
- **SC-009**: El 100 % de los duplicados históricos presentes en los datos de verificación queda
  identificado, y 0 registros cambian como consecuencia de identificarlos.
- **SC-010**: En los datos de verificación, el 100 % de las ediciones de registros con
  inconsistencias históricas que no cambian los campos involucrados se guarda, el 100 % de las que
  sí los cambian y dejan el registro en un estado inválido se rechaza, y 0 registros inconsistentes
  se corrigen o normalizan automáticamente.

## Assumptions

- MVP de un solo usuario (visión del proyecto). El modelo ya asocia las categorías a un propietario.
- Orden alfabético por nombre: es el comportamiento actual de la consulta existente.
- Longitud máxima de 50 caracteres para nombre e ícono: valor razonable por omisión (la base no
  impone límite); el plan puede ajustarlo antes de implementar.
- El formato de color `#RRGGBB` es el que usa el seed. Mostrar el ícono gráficamente no es obligatorio
  en esta funcionalidad: se guarda y se edita como texto.
- No hay borrado físico (Constitución III); "desactivar" es la única forma de retirar una categoría.
- Sin cambios de esquema (Constitución IV): la unicidad se valida en la aplicación, sin índices nuevos.
  Tampoco se normalizan ni corrigen datos existentes en Neon.
- La clave de configuración del usuario actual es `CURRENT_USER_ID` (definida en el plan); solo se
  documenta el nombre de la clave, nunca su valor (Constitución VIII). La documentación DEBE indicar
  explícitamente que no es un mecanismo de autenticación.
- Pruebas: según la Constitución VII, esta funcionalidad DEBE incluir pruebas automatizadas de
  validaciones, unicidad, correspondencia de tipos, pertenencia, contrato y regresión de Movimientos.
  Al ser la primera, el plan incluye la configuración mínima de pruebas con Vitest (herramienta
  obligatoria desde la Constitución v1.2.0; DA-03 cerrado), sin escribir sobre los datos reales de
  Neon (DA-06).
- Documentación al cerrar: roadmap (Categorías y Movimientos) y CHANGELOG (Constitución IX, DA-02).
- **Fuera de alcance**: dashboard, cuentas, metas, reportes y presupuestos; login o JWT; cambios de
  esquema; refactorizaciones generales; navegación móvil del sidebar; corrección o fusión automática
  de datos históricos; aislamiento por usuario de las consultas GET de movimientos, cuentas,
  usuarios, metas y presupuestos (riesgo residual registrado en el plan). Los cambios en Movimientos
  se limitan a FR-021 a FR-024 y FR-026 (crear, editar y, desde la revisión del plan del 2026-11-12,
  la validación de pertenencia al desactivar).
- **Dependencias**: API disponible y base Neon accesible; asuntos abiertos DA-05 y DA-06 de la
  Constitución v1.2.0 (DA-03 quedó cerrado con Vitest).
