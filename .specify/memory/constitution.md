# Wolfy Lunar Budget (LunarBudget) Constitution

Constitución de LunarBudget: gestor de presupuesto personal (usuario único en el MVP) que reemplaza
un Excel personal de ingresos, gastos, ahorro y metas. Consolida la arquitectura real del repositorio
y la documentación existente en `docs/`, en especial `docs/05-desarrollo/convenciones.md`,
`docs/06-ia/claude.md` y `docs/06-ia/prompt-maestro.md`.

Convención normativa: **DEBE / NO DEBE** = obligatorio y verificable; **DEBERÍA** = recomendado.
Toda desviación de un DEBERÍA se justifica por escrito en el plan de la especificación.

## Core Principles

### I. Continuidad de Arquitectura y Stack

- El stack oficial es: API con Node.js + Express 4 + TypeScript 5 (`strict`) + Prisma ORM 6 +
  PostgreSQL en Neon; frontend con Next.js 16 (App Router) + React 19 + TypeScript (`strict`) +
  Tailwind CSS 4 + `lucide-react` para íconos. NO DEBE reemplazarse, añadirse otro framework
  ni saltar de versión mayor sin una especificación que lo justifique y la aprobación de Andrés.
- Toda dependencia nueva DEBE justificarse en el plan: problema concreto, por qué las herramientas
  existentes no bastan, alternativas evaluadas, y en qué `package.json` (`api/` o `web/`) entra.
- Todo código fuente nuevo DEBE ser TypeScript. `any` NO DEBE usarse salvo con un comentario en el
  código y una justificación en el plan.
- Los estilos DEBEN hacerse solo con Tailwind CSS (sin CSS Modules, Styled Components ni Emotion)
  y respetar la identidad visual actual: fondo oscuro (`zinc`), violeta como color principal, verde
  para ingresos, rojo para gastos, azul (`sky`) para ahorro y gris para información secundaria.
- Verificación: el diff de `package.json` y `package-lock.json` coincide con lo aprobado en el plan,
  y `tsc --noEmit` termina sin errores en `api/` y en `web/`.

Justificación: el proyecto es también un ejercicio de fundamentos y de portafolio; la consistencia
pesa más que la novedad tecnológica.

### II. Separación de Responsabilidades según la Organización Actual

- API (`api/src/`):
  - `modules/<dominio>/<dominio>.routes.ts` solo asocia método + ruta → handler.
  - `modules/<dominio>/<dominio>.controller.ts` contiene validación, acceso con Prisma y respuesta.
  - `server.ts` solo configura Express, registra middlewares y rutas, y levanta el servidor.
  - `lib/prisma.ts` es la única instancia de `PrismaClient` de la aplicación (el seed queda exento).
  - `config/env.ts` centraliza la lectura de variables de entorno.
- Web (`web/`):
  - `app/**/page.tsx` compone componentes; puede tener estado de orquestación (por ejemplo, una
    señal de refresco) pero NO DEBE contener reglas de negocio ni llamadas HTTP directas.
  - `components/<dominio>/` contiene la UI de cada dominio; un componente NO DEBE ubicarse en la
    carpeta de otro dominio.
  - `services/*.service.ts` es el único lugar con llamadas HTTP, siempre a través de
    `services/api.ts`. `fetch()` NO DEBE usarse fuera de `services/`.
  - `types/` contiene las interfaces compartidas que reflejan los payloads del backend; NO DEBEN
    duplicarse interfaces dentro de componentes.
- Capas nuevas (services, repositories, DTOs o validators en la API; hooks compartidos o estado
  global en la web) están previstas como evolución en `docs/02-arquitectura/`, pero solo PUEDEN
  introducirse si el plan las justifica con un problema concreto (por ejemplo, lógica reutilizada por
  dos o más controladores, o una transacción entre dominios) y las registra en "Complexity Tracking".
- Verificación: revisión del diff por carpeta y `grep` de `fetch(` fuera de `web/services/`.

Justificación: la separación actual ya funciona (el módulo Movimientos es la referencia). Imponer
capas sin necesidad añade complejidad sin beneficio.

### III. Fidelidad al Modelo de Datos y a los Contratos Existentes

- Las tablas DEBEN conservar el prefijo `WLB_` mediante `@@map` (`WLB_USUARIO`, `WLB_CUENTA`,
  `WLB_CATEGORIA`, `WLB_MOVIMIENTO`, `WLB_META`, `WLB_PRESUPUESTO_MENSUAL`), y los modelos de Prisma
  sus nombres actuales (`Usuario`, `Cuenta`, `Categoria`, `Movimiento`, `Meta`, `PresupuestoMensual`).
- Las columnas DEBEN seguir el patrón de prefijo de entidad + nombre en PascalCase (`USU`, `CUE`, `CAT`,
  `MOV`, `MET`, `PRE`): id `<PREFIJO>Id` entero autoincremental, `<PREFIJO>CreadoEn` y, donde exista,
  borrado lógico con `<PREFIJO>Activa`. Toda entidad nueva DEBE seguir la misma convención.
- Los nombres que devuelve el backend (por ejemplo `MOVMonto` o `CUENombre`) DEBEN llegar sin cambios
  a `web/types/`. Si la UI necesita otra forma, la transformación DEBE hacerse en el servicio o el
  componente, sin alterar el contrato.
- Las relaciones existentes (Usuario 1–N Cuenta, Categoria, Movimiento, Meta y PresupuestoMensual;
  Movimiento N–1 Cuenta; Movimiento N–0..1 Categoria; PresupuestoMensual N–1 Categoria) NO DEBEN
  modificarse sin aplicar el Principio IV.
- Los registros financieros NO DEBEN borrarse físicamente; se desactivan con `<PREFIJO>Activa`
  (patrón documentado en el roadmap e implementado en Movimientos).
- Todo cambio de contrato de la API (rutas, métodos, campos, forma de la respuesta, códigos HTTP)
  DEBE declararse en la especificación en una sección "Cambio de contrato", con la lista de
  consumidores afectados en `web/`.
- Verificación: diff de `schema.prisma` vacío o aprobado, y tipos de `web/types/` alineados con las
  respuestas reales de la API.

Justificación: el esquema ya está desplegado en Neon y el frontend depende de esos nombres literales.

### IV. Cambios de Esquema y Migraciones Solo con Aprobación Explícita (NO NEGOCIABLE)

- Cualquier cambio en `api/prisma/schema.prisma` o en `api/prisma/migrations/` DEBE:
  1. estar descrito en una especificación aprobada;
  2. generarse primero sin aplicarse (`prisma migrate dev --create-only` o `prisma migrate diff`),
     con el SQL resultante adjunto para revisión;
  3. contar con la aprobación explícita de Andrés antes de aplicarse;
  4. tener definida una estrategia de respaldo o reversión para la base de Neon (ver DA-06).
- Los agentes de IA NO DEBEN ejecutar comandos que escriban en la base de datos: `prisma migrate
  dev|deploy|reset`, `prisma db push`, `prisma db execute`, `prisma db seed` / `npm run prisma:seed`,
  ni escrituras manuales. Sí PUEDEN ejecutar comandos de solo lectura: `prisma validate` y
  `prisma migrate status`.
- `prisma db push` NO DEBE usarse contra Neon; todo cambio de esquema pasa por Prisma Migrate.
- Las migraciones ya aplicadas NO DEBEN editarse. Los cambios destructivos (eliminar tablas o
  columnas, reducir tipos, nuevos `NOT NULL` sobre datos existentes) DEBEN incluir un plan de
  migración de datos.
- El código de la aplicación NO DEBE contener SQL manual; todo acceso a PostgreSQL se hace con
  Prisma Client.
- Verificación: ningún archivo de `migrations/` cambia sin la aprobación registrada en la
  especificación o el PR.

Justificación: Neon contiene los datos financieros reales de Andrés, y el historial de migraciones
ya presenta inconsistencias (DA-07).

### V. Integridad de los Datos Financieros

- Los montos DEBEN persistirse como `Decimal` (tal como están en el esquema actual). Las sumas,
  saldos y totales DEBEN calcularse en el backend con `Prisma.Decimal` o con agregaciones de Prisma
  (`aggregate`/`groupBy` con `_sum`), y NO DEBEN acumularse con `number` de JavaScript.
- El frontend DEBE limitarse a formatear para mostrar (por ejemplo `Q` + 2 decimales). NO DEBE ser la
  fuente de totales financieros que se reportan o se persisten.
- Los campos `Decimal` viajan como `string` en el JSON (comportamiento observado), y los tipos de
  `web/types/` DEBEN reflejarlo.
- Toda escritura DEBE validarse en el backend, aunque el frontend también valide: tipos, montos
  finitos > 0, fechas válidas y existencia de las referencias que asigna o modifica. El patrón de
  referencia es `movimientos.controller.ts`; la validación de pertenencia es obligatoria para
  endpoints de escritura nuevos o modificados.
- Pertenencia del registro: toda escritura sobre un registro existente (editar, desactivar o
  cualquier otra) DEBE verificar que el propio registro pertenece al usuario actual, aunque no
  cambie ningún otro campo.
- Referencias a cuentas y categorías: el estado activo y la pertenencia al mismo `USUId` DEBEN
  validarse cuando la operación **asigna o modifica** esa referencia (creación, o edición en la que
  el valor nuevo difiere del persistido).
  - Conservar sin cambios una referencia histórica no es una nueva asignación y no exige revalidar
    su estado activo ni su pertenencia, **siempre que la escritura no incluya ese campo** en los
    datos que actualiza. Por eso las ediciones DEBEN enviar a Prisma solo los campos que cambian.
  - En Movimientos, si cambia `MOVTipo` o `CATId`, la categoría resultante (si existe) DEBE cumplir
    las reglas vigentes de pertenencia, estado activo y correspondencia de tipo, aunque la categoría
    sea la misma que ya tenía.
- Las referencias históricas inconsistentes (inactivas, de otro usuario o de tipo que no
  corresponde) NO DEBEN corregirse, reasignarse ni normalizarse automáticamente; solo cambian por
  una edición explícita que las valide.
- Una operación que escriba más de un registro, o cuya validez dependa de una lectura dentro de la
  misma operación, DEBE ejecutarse con `prisma.$transaction`.
- Las fechas de calendario (por ejemplo `MOVFecha`) DEBEN conservar el día que eligió el usuario,
  sin desplazamientos por zona horaria: se envía `YYYY-MM-DD` y se formatea operando sobre el texto
  ISO (patrón actual).
- Las reglas de redondeo y el número máximo de decimales DEBEN definirse en la especificación que
  las necesite (DA-04).
- Verificación: pruebas o casos de verificación (Principio VII) con montos decimales, límites,
  referencias inválidas, registros de otro usuario y ediciones que conservan referencias históricas
  (comprobando que no se incluyen en los datos de la actualización).

Justificación: un error de precisión o una referencia cruzada entre usuarios corrompe información
financiera sin que el usuario lo note.

### VI. Reglas de Negocio Explícitas, Nunca Inferidas (NO NEGOCIABLE)

- Hoy NO están documentadas las reglas de: saldo actual de una cuenta, efecto de un movimiento
  `AHORRO`, transferencias entre cuentas, aportes y progreso de metas, comparación de presupuesto
  contra gasto, ni el cálculo de "Disponible" en el dashboard. `docs/04-reglas-negocio/` se menciona
  en `docs/06-ia/chatgpt.md` pero no existe.
- Toda especificación que toque esas reglas DEBE marcarlas como `[NEEDS CLARIFICATION]` y obtener la
  decisión de Andrés (`/speckit-clarify`) antes del plan. La decisión DEBE registrarse en la
  especificación y en la documentación de reglas de negocio (ubicación: DA-01).
- Los valores válidos actuales de `MOVTipo` son `INGRESO`, `GASTO` y `AHORRO` (definidos en
  `movimientos.controller.ts` y en `web/types/movimiento.ts`). Añadir valores como
  `TRANSFERENCIA` exige una especificación aprobada.
- Mientras el dashboard use datos mock, al reemplazarlos NO DEBEN mostrarse cifras calculadas con
  reglas no aprobadas; lo pendiente DEBE quedar indicado como tal en la UI.
- Verificación: la especificación no contiene reglas financieras sin la fuente de su decisión.

Justificación: inventar una regla de saldo o de ahorro produce números aparentemente correctos pero
falsos; es el riesgo más alto del producto.

### VII. Pruebas Automatizadas por Defecto

- Hecho observado: hoy el repositorio no tiene infraestructura de pruebas (ni framework ni archivos de
  prueba). Ninguna especificación DEBE asumir que existe, pero esa ausencia NO DEBE usarse como
  justificación para verificar solo de forma manual.
- Toda funcionalidad nueva y toda corrección de error DEBEN incluir pruebas automatizadas cuando sea
  técnicamente viable. Si la infraestructura necesaria no existe, la especificación DEBE incluir en
  `tasks.md` las tareas para crear la configuración mínima.
- Herramienta (DA-03, resuelto el 2026-11-12): las pruebas automatizadas de `api/` y `web/` DEBEN
  usar **Vitest** como `devDependency` de cada paquete, con la configuración mínima que defina la
  primera especificación que la instale (feature 001). Usar otra herramienta de pruebas, o añadir
  librerías auxiliares (por ejemplo, para mocks o DOM), DEBE justificarse en el plan según el
  Principio I.
- Cobertura mínima esperada en lo que se cree o modifique: validaciones del backend, cálculos y
  agregaciones financieras, reglas de negocio aprobadas, transformaciones de datos en los servicios
  del frontend, y el contrato de los endpoints afectados (códigos HTTP y forma de la respuesta).
- Solo es técnicamente inviable lo que, en el estado actual del proyecto, exigiría escribir sobre
  datos reales de Neon u otro sistema que no puede aislarse ni sustituirse por dobles de prueba.
  Que falte un entorno de base aislado (DA-06) solo justifica omitir las pruebas que dependen de la
  base; NO las de lógica pura (validaciones, cálculos, transformaciones), que DEBEN automatizarse.
- Toda excepción DEBE registrarse en "Complexity Tracking" del plan con: el motivo técnico concreto,
  los casos manuales reproducibles que la cubren (petición → respuesta esperada, o pasos de UI →
  resultado esperado) con evidencia en el PR, y la condición que permitirá automatizarla. La
  excepción queda como pendiente en el roadmap hasta cerrarse. La verificación manual complementa a
  la automatizada y no la sustituye cuando esta es viable.
- Toda corrección de error DEBE incluir una prueba de regresión que falle antes del cambio y pase
  después; solo si es inviable, se registra como excepción con un caso manual documentado.
- Las pruebas DEBEN escribirse en TypeScript y NO DEBEN escribir en la base de Neon con datos reales;
  DEBEN usar una base aislada o dobles de prueba (DA-06).
- `/speckit-analyze` y la revisión del PR DEBEN rechazar una especificación o implementación con
  lógica nueva sin pruebas automatizadas ni excepción registrada.
- Puertas mínimas de cualquier cambio: `tsc --noEmit` sin errores en `api/` y `web/`, `npm run lint`
  sin errores en `web/`, `npm run build` correcto en `web/` y en `api/`, y las pruebas automatizadas
  existentes en verde. Mientras `api/dist/` siga versionado (DA-08), los cambios que el build genere
  en `api/dist/` NO DEBEN incluirse en el commit de la especificación sin una decisión explícita.

Justificación: la verificación manual no se repite de forma confiable y no detecta regresiones
en cálculos financieros. Crear la infraestructura dentro de la primera especificación que la necesite
evita que la deuda de pruebas se vuelva permanente.

### VIII. Seguridad de Credenciales y Configuración Local

- Ninguna credencial, cadena de conexión, token ni contraseña real DEBE aparecer en el código, la
  documentación, las especificaciones, los commits, los logs ni las respuestas de agentes de IA.
- Los valores de `api/.env`, `web/.env.local`, `.claude/settings.local.json` y de cualquier
  configuración local NO DEBEN reproducirse; solo PUEDEN mencionarse los nombres de las claves
  (por ejemplo `DATABASE_URL`, `PORT`, `NODE_ENV`, `NEXT_PUBLIC_API_URL`). En la documentación
  DEBEN usarse valores de ejemplo (`USUARIO:PASSWORD@HOST`).
- `.env*` DEBE seguir ignorado por Git (está verificado en `api/.gitignore` y `web/.gitignore`).
  DEBERÍA existir un `.env.example` solo con nombres de claves (DA-08).
- Los archivos locales de máquina (`.claude/settings.local.json`, `.specify/feature.json`) NO DEBEN
  commitearse.
- Las respuestas de error de la API NO DEBEN exponer objetos de error internos, stack traces ni
  detalles de la base de datos. Los controladores que hoy devuelven `error` crudo DEBEN corregirse
  cuando una especificación los toque.
- Las credenciales de ejemplo son inseguras por definición: el usuario demo y la contraseña en
  texto plano de `api/prisma/seed.ts`, los valores de ejemplo de la documentación
  (`USUARIO:PASSWORD@HOST`) y cualquier contraseña por defecto o trivial.
  - NUNCA DEBEN usarse, crearse ni conservarse en un entorno compartido o productivo. Se considera
    así cualquier base de datos o despliegue accesible por otra persona o que contenga datos
    financieros reales.
  - El seed solo PUEDE ejecutarse contra una base de desarrollo aislada. Antes de volver a
    ejecutarlo contra la base Neon actual, DEBE decidirse si esa base es de desarrollo o productiva
    (DA-06).
  - Si un entorno compartido o productivo contiene un usuario con credenciales de ejemplo, DEBE
    cambiarse la credencial o desactivarse el usuario antes de considerar apto ese entorno.
  - Ninguna especificación, prueba ni fixture DEBE presentar credenciales de ejemplo como reales ni
    reutilizarlas fuera de entornos aislados.
  - El hash de contraseñas se definirá en la especificación de autenticación. Hasta entonces, ningún
    entorno compartido o productivo DEBE tener cuentas con contraseñas conocidas o de ejemplo.
- Verificación: revisión del diff y búsqueda de patrones de credenciales (`postgresql://`,
  `password=`, tokens) antes de cada commit; antes de ejecutar el seed, confirmar que el destino de
  `DATABASE_URL` es una base de desarrollo aislada, sin mostrar su valor.

Justificación: la base está en la nube y el repositorio tiene remoto en GitHub; una fuga expone
datos financieros personales.

### IX. Criterios de Aceptación y Documentación de Cambios Funcionales

- Cada especificación funcional DEBE incluir:
  - historias de usuario con criterios de aceptación en formato Dado / Cuando / Entonces,
    verificables;
  - endpoints afectados, con ejemplos de petición y respuesta que usen los nombres reales de
    los campos;
  - estados de UI: carga, vacío, error, validación, confirmaciones y comportamiento responsive;
  - una sección "Fuera de alcance".
- Un cambio se considera terminado solo si: cumple los criterios de aceptación, tiene evidencia de
  verificación (Principio VII) y actualizó la documentación: `docs/01-proyecto/roadmap.md`,
  `docs/CHANGELOG.md`, `docs/02-arquitectura/*` si cambia la estructura o el modelo, y `README.md`
  si cambian scripts o variables de entorno.
- La entrega de cada implementación DEBE resumir: funcionalidad, archivos creados y modificados,
  decisiones técnicas, riesgos, validaciones ejecutadas y pendientes (formato de
  `docs/06-ia/claude.md` y `prompt-maestro.md`).

Justificación: el roadmap ya está desfasado respecto del código (DA-02); sin esta regla la
documentación deja de ser confiable.

### X. Compatibilidad y Alcance Acotado

- Cada implementación DEBE limitarse al alcance de su especificación: sin refactorizaciones,
  renombres, cambios estéticos ni funcionalidades futuras fuera de él. Los problemas que se
  encuentren fuera del alcance DEBEN registrarse como pendientes, no corregirse en silencio.
- La funcionalidad existente DEBE seguir operando: el CRUD de Movimientos (GET, POST, PATCH `/:id`,
  PATCH `/:id/desactivar`) y los GET de usuarios, cuentas, categorías, metas y presupuestos.
  Las regresiones sobre ellos DEBEN verificarse cuando el cambio los toque directa o indirectamente.
- Commits locales de agentes de IA (autorización permanente de Andrés, 2026-11-12): los agentes
  PUEDEN crear commits locales en la rama de trabajo actual sin pedir autorización por cada commit,
  siempre que se cumplan todas estas reglas:
  - Solo cambios **terminados y verificados**, agrupados por incrementos lógicos (no
    necesariamente uno por tarea). Una funcionalidad incompleta NO DEBE commitearse como si
    estuviera terminada.
  - Backend y frontend DEBERÍAN ir en commits separados cuando puedan agruparse de forma coherente.
  - Antes de cada commit DEBEN revisarse `git status` y `git diff`, y el staging DEBE ser selectivo
    (archivos o rutas concretos); `git add .`, `git add -A` y equivalentes NO DEBEN usarse.
  - NO DEBEN incluirse `.env*`, secretos, configuraciones locales sensibles (por ejemplo
    `.claude/settings.local.json`), `.specify/feature.json` ni los artefactos generados en
    `api/dist/`.
  - Antes de un primer commit sobre cambios acumulados o archivos sin seguimiento, DEBEN revisarse
    uno por uno; NO DEBEN hacerse commits retrospectivos masivos sin esa revisión.
  - Si una verificación requiere una base aislada no disponible, el commit y su resumen DEBEN
    registrarla como pendiente y NO DEBEN afirmar que la integración está validada.
  - Formato obligatorio: Conventional Commits en español, con tipo `feat`, `fix`, `docs`,
    `refactor`, `test`, `chore`, `style` o `perf`, y alcance preferido `backend`, `frontend`,
    `database`, `spec` o `config`:

    ```text
    tipo(alcance): Descripción breve del cambio

    - Se implementó...
    - Se agregó...
    - Se corrigió...
    - Se incorporaron pruebas...
    ```

  - Al terminar, el agente DEBE informar los commits creados con su hash corto.
- Los agentes de IA NO DEBEN hacer `git push` (incluido `push --force`), `reset` destructivo,
  `rebase`, `clean`, `checkout --` sobre cambios ni cambiar de rama sin una petición explícita
  para esa operación. Antes de cualquier operación destructiva DEBEN mostrar `git status` y
  explicar sus consecuencias.
- Verificación: el diff solo contiene archivos justificados por las tareas (`tasks.md`); cada
  commit de un agente respeta el formato, el staging selectivo y las exclusiones anteriores.

Justificación: proteger lo que ya funciona y mantener cambios pequeños y revisables. Los commits
locales por incrementos verificados dejan un historial revisable sin delegar operaciones remotas
ni destructivas.

## Restricciones Técnicas y de Entorno

- Repositorio: monorepo sin workspaces, con `api/` (Express + Prisma) y `web/` (Next.js), cada uno
  con su propio `package.json`; documentación en `docs/`; Spec Kit en `.specify/` y
  `.claude/skills/`. `database/`, `web/lib/` y `web/public/` existen vacíos.
- Entorno de desarrollo: Windows con PowerShell (Spec Kit está configurado con scripts `ps`) y
  Node.js 22. API en el puerto `PORT` (4000 por defecto); la web consume `NEXT_PUBLIC_API_URL`.
- Producto: un solo usuario en el MVP, con el modelo preparado para multiusuario (`USUId` en las
  entidades). Moneda observada: quetzales (`Q`); el soporte multimoneda está fuera del MVP.
- Fuera del MVP (según `docs/01-proyecto/vision.md`): multiusuario, presupuestos compartidos,
  integración bancaria, app móvil, notificaciones y exportación avanzada.
- Forma de respuesta de la API: el estándar vigente es `{ success, message, data }` (implementado en
  Movimientos). Los demás módulos devuelven `{ success, data }` sin `message`; la unificación DEBE
  hacerse por especificación y declararse como cambio de contrato (DA-05).

## Flujo de Desarrollo y Puertas de Calidad

- Flujo SDD: `/speckit-specify` → `/speckit-clarify` (obligatorio si aplica el Principio VI) →
  `/speckit-plan` (con "Constitution Check") → `/speckit-tasks` → `/speckit-analyze` →
  `/speckit-implement`. Las tareas de higiene técnica sin comportamiento funcional PUEDEN hacerse
  sin especificación, pero respetando los Principios IV, VIII y X.
- "Constitution Check" del plan: Principio I (stack y dependencias), II (ubicación por capa),
  III (nombres y contrato), IV (esquema), V (precisión, validación, transacciones), VI (reglas sin
  aclarar), VII (pruebas automatizadas o excepción registrada), VIII (credenciales y errores), IX (criterios y
  documentación) y X (alcance).
- Precedencia ante contradicciones: el código y el esquema reflejan el comportamiento actual; la
  documentación refleja la intención. Toda contradicción DEBE señalarse en la especificación que la
  toque y la resuelve Andrés; NO DEBE resolverse inventando información. Si se resuelve, la
  documentación DEBE actualizarse en el mismo cambio.

### Asuntos Abiertos Conocidos (al 2026-11-12)

Se resuelven mediante `/speckit-clarify` o una enmienda PATCH, y se eliminan de esta lista al cerrarse.
Cerrados: DA-03 (herramienta de pruebas: Vitest, ver Principio VII; enmienda 1.2.0).

- **DA-01** Ubicación de las reglas de negocio: `docs/06-ia/chatgpt.md` cita `docs/04-reglas-negocio/`,
  que no existe.
- **DA-02** Documentación vs. código: el roadmap marca como pendientes crear, editar y desactivar
  movimientos, que ya están implementados. `base-datos.md` dice que todo movimiento tiene categoría
  (`CATId` es opcional) y omite la relación Usuario → Categoria.
- **DA-04** Precisión monetaria: el esquema usa `Decimal(65,30)` por defecto de Prisma; faltan definir
  decimales máximos de entrada y la regla de redondeo.
- **DA-05** Contratos: forma de respuesta no unificada (ver "Restricciones Técnicas y de Entorno"). `web/types/categoria.ts` y
  `cuenta.ts` declaran `message: string`, que esas APIs no devuelven. `CATTipo` usa minúsculas
  (`ingreso`, `gasto`, `ahorro`) y `MOVTipo` mayúsculas, sin regla de correspondencia definida.
  Se mencionan "transferencias" (comentario del esquema y página de Categorías) que la API no
  admite.
- **DA-06** Entorno de base de datos para desarrollo y pruebas (¿rama de Neon, base local?) y
  estrategia de respaldo antes de migrar.
- **DA-07** Historial de migraciones: `init` crea solo `WLB_USUARIO`, y `add_movactiva_movimiento`
  crea las otras cinco tablas (el nombre no refleja el contenido); el archivo local solo difiere por
  finales de línea. Falta confirmar con `prisma migrate status` (solo lectura).
- **DA-08** Higiene del repositorio: `api/dist/` está versionado; `main`/`start` de la API apuntan a
  `dist/server.js`, pero el build genera `dist/src/server.js`; no hay `.gitattributes`; `master` y
  `Develop` divergen; no hay `.env.example`. La convención de "sin JavaScript nuevo" no aplica a
  artefactos de build, que no DEBERÍAN versionarse.

## Governance

- Esta constitución consolida y prevalece sobre `docs/05-desarrollo/convenciones.md`,
  `docs/06-ia/claude.md`, `docs/06-ia/chatgpt.md`, `docs/06-ia/prompt-maestro.md` y
  `docs/CONTRIBUTING.md` en caso de conflicto. Esos documentos siguen siendo la guía operativa
  detallada; cuando una enmienda los contradiga, DEBEN actualizarse en el mismo cambio.
- Enmiendas: solo con `/speckit-constitution`, con la aprobación explícita de Andrés, el Sync Impact
  Report revisado y, si una regla cambia el trabajo en curso, el plan de ajuste de las
  especificaciones afectadas.
- Versionado semántico: MAJOR para eliminar o redefinir principios de forma incompatible; MINOR para
  añadir principios o secciones, o ampliar materialmente una guía; PATCH para aclaraciones,
  redacción o cierre de asuntos abiertos sin cambiar reglas.
- Cumplimiento: cada plan DEBE pasar el "Constitution Check"; cada violación justificada DEBE
  registrarse en "Complexity Tracking"; `/speckit-analyze` y la revisión del PR DEBEN verificar el
  cumplimiento antes de implementar o fusionar.

**Version**: 1.3.0 | **Ratified**: 2026-11-11 | **Last Amended**: 2026-11-12
