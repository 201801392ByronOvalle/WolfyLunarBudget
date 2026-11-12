# Arquitectura Backend

## Wolfy Lunar Budget

---

# Objetivo

El backend de Wolfy Lunar Budget tiene como objetivo proporcionar una API REST organizada, mantenible y escalable para la administración de toda la información financiera del sistema.

La arquitectura busca mantener una clara separación de responsabilidades entre la configuración del servidor, el acceso a datos y la lógica de cada dominio del negocio.

---

# Stack Tecnológico

El backend utiliza las siguientes tecnologías:

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Neon PostgreSQL

---

# Arquitectura General

El proyecto sigue una arquitectura modular basada en dominios.

Cada dominio representa una entidad del negocio y contiene sus propios archivos relacionados.

Actualmente existen los siguientes módulos:

- Usuarios
- Categorías
- Cuentas
- Movimientos
- Metas
- Presupuestos

Cada módulo es independiente del resto.

---

# Estructura del Proyecto

```text
api/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── config/
│   │     env.ts
│   │
│   ├── lib/
│   │     prisma.ts
│   │     usuario-actual.ts
│   │
│   ├── modules/
│   │     usuarios/
│   │     categorias/        (controller, routes y categorias.rules.ts)
│   │     cuentas/
│   │     movimientos/
│   │     metas/
│   │     presupuestos/
│   │
│   ├── app.ts
│   └── server.ts
│
├── tests/                   (Vitest: http/, unit/, support/)
├── vitest.config.ts
├── tsconfig.test.json
├── package.json
└── tsconfig.json
```

---

# Responsabilidad de cada carpeta

## prisma/

Contiene todo lo relacionado con la base de datos.

Incluye:

- Schema de Prisma.
- Migraciones.
- Seed inicial.

No debe contener lógica del negocio.

---

## config/

Contiene la configuración general del proyecto.

Ejemplo:

- Variables de entorno.
- Configuración global.

---

## lib/

Contiene utilidades compartidas.

Actualmente:

- `prisma.ts`: instancia única de Prisma Client.
- `usuario-actual.ts`: lectura y verificación de `CURRENT_USER_ID` (ver "Usuario actual").

Toda la aplicación debe reutilizar esta instancia.

Nunca deben crearse múltiples instancias de Prisma.

`prisma.ts` exporta `OPCIONES_TRANSACCION = { maxWait: 5000, timeout: 10000 }` y la pasa como
`transactionOptions` al constructor, de modo que aplica a todas las transacciones interactivas:

- `maxWait` 5000 ms: tiempo máximo para obtener una conexión e iniciar la transacción. Deja margen
  para que Neon reanude el compute suspendido (el valor por omisión de Prisma, 2 s, es corto).
- `timeout` 10000 ms: duración máxima de la transacción. Las de esta API son lecturas y una
  escritura, muy por debajo de ese límite.

Si se supera alguno, Prisma lanza `P2028` y la operación responde 500 con su mensaje genérico.

---

## modules/

Es el corazón del backend.

Cada carpeta representa un dominio del negocio.

Cada módulo contiene únicamente el código relacionado con su propia responsabilidad.

---

# Organización de un módulo

Cada módulo sigue la siguiente estructura:

```text
movimientos/

movimientos.controller.ts

movimientos.routes.ts
```

En futuras iteraciones podrán incorporarse:

```text
movimientos/

movimientos.controller.ts

movimientos.routes.ts

movimientos.service.ts

movimientos.repository.ts

dto/

validators/
```

La estructura podrá crecer sin afectar el resto del proyecto.

---

# app.ts y server.ts

`app.ts` crea y exporta la aplicación Express: middlewares (`cors`, `express.json`), `/`, `/health` y
las rutas de cada módulo. No escucha en ningún puerto, para que las pruebas HTTP puedan levantarla
en un puerto efímero.

`server.ts` es el punto de entrada:

1. Verifica `CURRENT_USER_ID` con `inicializarUsuarioActual()`.
2. Si falla, escribe el mensaje en consola, desconecta Prisma y termina con el código de salida
   correspondiente (78 configuración, 69 conexión, 1 otro).
3. Si es válido, escucha en `PORT`.

Entre los dos, solo deben encargarse de:

- Configurar Express.
- Registrar middlewares.
- Registrar rutas.
- Levantar el servidor.

No debe contener:

- Consultas a la base de datos.
- Reglas de negocio.
- Validaciones.
- Procesamiento de información.

---

# Prisma

Prisma es el único mecanismo autorizado para acceder a PostgreSQL.

No deben utilizarse consultas SQL manuales dentro del código de la aplicación.

Toda interacción con la base de datos debe realizarse mediante Prisma Client.

---

# Endpoints

Cada módulo expone sus propios endpoints REST.

Ejemplo:

GET /api/movimientos

GET /api/cuentas

GET /api/categorias

GET /api/metas

GET /api/presupuestos

GET /api/usuarios

En futuras versiones cada módulo podrá incorporar operaciones CRUD completas.

---

# Usuario actual (`CURRENT_USER_ID`)

La aplicación es de un único usuario y aún no tiene autenticación. El usuario con el que se escribe y
se filtra lo determina el servidor con `CURRENT_USER_ID`:

- `inicializarUsuarioActual()` valida que sea un entero positivo y que el usuario exista (una sola
  consulta `findUnique`). Distingue errores de configuración (`ConfiguracionUsuarioActualError`) de
  errores de conexión (`ConexionBaseDatosError`: `P1001`, `P1002`, `P1008`, `P1017` o
  `PrismaClientInitializationError`).
- `obtenerUsuarioActualId()` devuelve el id ya verificado a los controladores.
- No es autenticación: no protege la API.

---

# Módulo de Categorías (feature 001-gestion-categorias)

## Reglas puras: `categorias.rules.ts`

Funciones sin acceso a datos, probadas de forma unitaria:

- `normalizarNombre` (`trim().toLowerCase()`), `validarNombre` (1–50 caracteres), `validarTipo`
  (`ingreso`, `gasto`, `ahorro`), `validarColor` (`#RRGGBB`), `validarIcono`.
- `tipoCorresponde(catTipo, movTipo)`: `ingreso`↔`INGRESO`, `gasto`↔`GASTO`, `ahorro`↔`AHORRO`.
- `detectarDuplicados`: agrupa por tipo y nombre normalizado (diagnóstico de solo lectura).
- `cambiosCategoria` y `cambiosMovimiento`: qué campos cambian respecto de lo persistido (FR-026).

## Endpoints y orden de rutas

```text
GET   /api/categorias
GET   /api/categorias/duplicados
POST  /api/categorias
PATCH /api/categorias/:id/desactivar
PATCH /api/categorias/:id/activar
PATCH /api/categorias/:id          ← siempre al final
```

Las rutas fijas se registran **antes** de `/:id` para que `duplicados`, `desactivar` o `activar` nunca
se interpreten como un identificador. El contrato está en
`specs/001-gestion-categorias/contracts/categorias.md`.

## Unicidad y transacciones `Serializable`

No hay restricción `UNIQUE` en la base (no se modifica `schema.prisma`). La unicidad por usuario,
tipo y nombre normalizado (incluidas las inactivas) se comprueba en la aplicación:

- Crear, y editar cuando cambian el nombre o el tipo, leen los posibles duplicados y escriben dentro
  de una transacción `Serializable`.
- Ante un conflicto de serialización (`P2034`, o SQLSTATE `40001` / "could not serialize access") se
  repite la transacción completa hasta **3 intentos**; si se agotan, responde 409.
- **Límites:** solo protege frente a otras transacciones `Serializable` de esta API. Escrituras fuera
  de la API pueden crear duplicados, y SSI puede abortar operaciones sin conflicto real (reintentos
  o 409). Los duplicados históricos se identifican con `GET /api/categorias/duplicados` y no se
  corrigen automáticamente.
- `P2028` (transacción no iniciada a tiempo o expirada) **no se trata como `P2034`**: no se
  reintenta y responde 500 con el mensaje genérico; en consola solo se registra el código.
- Editar sin cambiar nombre ni tipo, activar y desactivar usan una transacción con el aislamiento
  por omisión (lectura y escritura juntas).

---

# Movimientos: cambios de la feature 001

Crear, editar y desactivar leen y escriben dentro de `prisma.$transaction` (aislamiento por omisión;
`P2028` → 500 sin reintento):

- **Crear:** `USUId` es opcional; si viene y difiere del usuario actual responde 400. Se crea siempre
  con el usuario actual. Cuenta y categoría deben ser del usuario (si no, 404), estar activas (409) y
  la categoría debe corresponder al tipo (400).
- **Editar:** un movimiento de otro usuario responde 404. Si cambian `MOVTipo` o `CATId`, la
  categoría resultante debe cumplir las reglas actuales; si no cambian, se conserva la categoría
  histórica (inactiva o de tipo incompatible) sin revalidarla. La actualización envía a Prisma
  **solo los campos que cambian** (Principio V): `CATId` y `CUEId` sin cambios no se incluyen.
- **Desactivar:** un movimiento de otro usuario responde 404 sin modificarse.

`GET /api/movimientos` no cambia y sigue sin filtrar por usuario (riesgo residual R-6).

---

# Pruebas automatizadas

Vitest (`npm test`) con pruebas unitarias y HTTP (`app.listen(0)` + `fetch` nativo). Prisma se
sustituye con `vi.mock` por un doble en memoria (`tests/support/prisma-fake.ts`) y `DATABASE_URL`
apunta a un host `.invalid`, de modo que ninguna prueba puede conectarse a una base real.

El doble **no** reproduce el aislamiento, SSI, los tiempos ni la concurrencia de PostgreSQL; esos
comportamientos se verifican con los casos manuales en una base aislada
(`specs/001-gestion-categorias/quickstart.md`).

---

# Escalabilidad

La arquitectura fue diseñada para permitir el crecimiento del sistema sin necesidad de reorganizar el proyecto.

La incorporación de nuevos módulos deberá respetar la misma estructura establecida.

Ejemplos futuros:

- Recordatorios
- Reportes
- Configuración
- Autenticación
- Auditoría

---

# Principios de Desarrollo

Durante el desarrollo del backend deben mantenerse los siguientes principios:

- Responsabilidad única.
- Separación de responsabilidades.
- Código modular.
- Bajo acoplamiento.
- Alta cohesión.
- Reutilización de componentes.
- Código tipado mediante TypeScript.

---

# Convenciones

Todo nuevo módulo debe seguir la estructura establecida.

Ejemplo:

```text
nombre-modulo/

nombre-modulo.controller.ts

nombre-modulo.routes.ts
```

Los nombres de archivos deben mantenerse consistentes con el nombre del módulo.

---

# Evolución Esperada

La arquitectura actual corresponde a la primera etapa del proyecto.

Conforme el sistema crezca se incorporarán:

- Services.
- Repositories.
- DTOs.
- Validaciones.
- Middleware de autenticación.
- Manejo centralizado de errores.
- Logging.
- Pruebas de integración contra una base aislada (hoy solo hay pruebas con un doble de Prisma).

La estructura actual fue diseñada para facilitar esa evolución sin necesidad de realizar cambios importantes en la organización del proyecto.