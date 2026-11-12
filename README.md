# Wolfy Lunar Budget

Wolfy Lunar Budget es un gestor de presupuesto personal, pensado como proyecto de repaso de fundamentos de programación, buenas prácticas y arquitectura fullstack.

La idea principal del proyecto es reemplazar un Excel personal de ingresos, gastos, ahorro y metas financieras por una aplicación web privada, accesible desde distintos dispositivos.

---

## Objetivo del proyecto

El objetivo inicial es construir una aplicación que permita:

- Registrar ingresos.
- Registrar gastos.
- Clasificar movimientos por categorías.
- Separar dinero por cuentas.
- Medir ahorro mensual.
- Dar seguimiento a metas personales.
- Visualizar un dashboard financiero simple.
- Mantener una base de datos en la nube.

---

## Stack definido

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Neon PostgreSQL

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Base de datos

- PostgreSQL en Neon
- Prisma Migrate para versionado de cambios
- Prisma Client para consultas desde Express

---

## Estructura inicial del proyecto

```txt
WolfyLunarBudget/
  api/
  web/
  database/
  README.md
```

---

## Backend API

El backend se creó con Express, TypeScript y Prisma.

### Estructura del backend

```txt
api/
  prisma/
    migrations/
    schema.prisma
    seed.ts
  src/
    config/
      env.ts
    lib/
      prisma.ts
      usuario-actual.ts
    modules/
      usuarios/
        usuarios.controller.ts
        usuarios.routes.ts
      categorias/
        categorias.controller.ts
        categorias.routes.ts
        categorias.rules.ts
      cuentas/
        cuentas.controller.ts
        cuentas.routes.ts
      movimientos/
        movimientos.controller.ts
        movimientos.routes.ts
      metas/
        metas.controller.ts
        metas.routes.ts
      presupuestos/
        presupuestos.controller.ts
        presupuestos.routes.ts
    app.ts
    server.ts
  tests/
    http/
    unit/
    support/
  .env
  package.json
  tsconfig.json
```

---

## Configuración de entorno

En `api/.env` se debe configurar:

```env
DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST/wolfy_lunar_budget?sslmode=require"

PORT=4000
NODE_ENV=development
CURRENT_USER_ID=
```

### `CURRENT_USER_ID`

`CURRENT_USER_ID` es el identificador (entero positivo) de un usuario existente en `WLB_USUARIO`.
La API lo usa como **usuario actual determinado por el servidor**: Categorías filtra y crea con él, y
Movimientos valida que el movimiento, la cuenta y la categoría le pertenezcan. El cliente no puede
escoger otro usuario.

> **No es autenticación.** Solo fija el usuario con el que trabaja esta instalación de un único
> usuario. No protege la API ni sustituye un inicio de sesión.

Al arrancar, la API verifica la variable y **no arranca** si no es válida:

| Situación al iniciar | Mensaje en consola | Código de salida |
|---|---|---|
| Falta o está vacía | `Error de configuración: CURRENT_USER_ID falta` | 78 |
| No es un entero positivo | `Error de configuración: CURRENT_USER_ID no es un entero positivo` | 78 |
| No existe ese usuario | `Error de configuración: CURRENT_USER_ID no corresponde a un usuario existente` | 78 |
| No se puede conectar a la base para verificarlo | `Error de conexión a la base de datos al verificar CURRENT_USER_ID` | 69 |
| Otro error inesperado | Mensaje genérico de arranque | 1 |

Los mensajes nunca muestran el valor configurado ni la cadena de conexión. No publiques los valores
de `.env` en issues, PR ni capturas.

---

## Scripts del backend

Dentro de la carpeta `api`, se usan estos comandos:

### Instalar dependencias

```bash
npm install
```

### Levantar el backend en desarrollo

```bash
npm run dev
```

La API corre en:

```txt
http://localhost:4000
```

### Generar Prisma Client

```bash
npx prisma generate
```

o usando script:

```bash
npm run prisma:generate
```

### Ejecutar migraciones

```bash
npx prisma migrate dev --name nombre_migracion
```

o usando script:

```bash
npm run prisma:migrate
```

### Ejecutar seed

```bash
npm run prisma:seed
```

### Pruebas automatizadas (Vitest)

```bash
npm test
```

Ejecuta las pruebas de `api/tests/` con un doble de Prisma en memoria y una `DATABASE_URL` en un
host `.invalid`: **no se conectan a ninguna base de datos**. Por eso no demuestran el comportamiento
real de PostgreSQL (aislamiento, `P2034`, `P2028`, tiempos); eso se verifica con los casos manuales
en una base aislada (`specs/001-gestion-categorias/quickstart.md`).

En `web/`, `npm test` ejecuta las pruebas de funciones puras de `services/`.

### Verificación de tipos

```bash
npm run typecheck
```

Comprueba los tipos del código y de las pruebas (`tsconfig.test.json`), sin generar archivos.

> `npm run build` escribe en `api/dist/`, que está versionado: no incluyas esos cambios generados en
> los commits.

---

## Endpoints iniciales

### API base

```txt
GET /
```

Respuesta esperada:

```json
{
  "success": true,
  "message": "Wolfy Lunar Budget API running"
}
```

### Health check

```txt
GET /health
```

Respuesta esperada:

```json
{
  "success": true,
  "status": "OK"
}
```

### Usuarios

```txt
GET /api/usuarios
```

### Categorías

```txt
GET   /api/categorias
GET   /api/categorias/duplicados
POST  /api/categorias
PATCH /api/categorias/:id/desactivar
PATCH /api/categorias/:id/activar
PATCH /api/categorias/:id
```

Todas trabajan solo con las categorías del usuario actual (`CURRENT_USER_ID`). El contrato completo
está en `specs/001-gestion-categorias/contracts/categorias.md`.

### Cuentas

```txt
GET /api/cuentas
```

### Movimientos

```txt
GET   /api/movimientos
POST  /api/movimientos
PATCH /api/movimientos/:id
PATCH /api/movimientos/:id/desactivar
```

Crear, editar y desactivar validan la pertenencia al usuario actual y la correspondencia entre el
tipo del movimiento y el de su categoría. Ver `specs/001-gestion-categorias/contracts/movimientos.md`.

### Metas

```txt
GET /api/metas
```

### Presupuestos

```txt
GET /api/presupuestos
```

---

## Modelos iniciales en Prisma

Los modelos iniciales definidos son:

- Usuario
- Cuenta
- Categoria
- Movimiento
- Meta
- PresupuestoMensual

Se usa `@@map` para mantener nombres de tablas con prefijo `WLB_` en PostgreSQL, mientras que en el código se usan nombres más cómodos.

Ejemplo:

```prisma
model Usuario {
  USUId        Int      @id @default(autoincrement())
  USUNombre    String
  USUCorreo    String   @unique
  USUPassword  String
  USUCreadoEn  DateTime @default(now())

  @@map("WLB_USUARIO")
}
```

---

## Tablas principales

```txt
WLB_USUARIO
WLB_CUENTA
WLB_CATEGORIA
WLB_MOVIMIENTO
WLB_META
WLB_PRESUPUESTO_MENSUAL
```

---

## Seed inicial

El seed inicial crea:

### Usuario demo

```txt
admin@wolfylunar.com
```

### Cuentas iniciales

- BI Sueldo
- BAC Ahorro General
- BAC Viaje
- Gastos y Hobbies

### Categorías iniciales

- Salario
- Ahorro
- Comida
- Transporte
- Servicios
- Libros
- Juegos
- Salidas
- Emergencias

### Metas iniciales

- Viaje a México
- Carro
- Inversión plazo fijo

> La contraseña del usuario demo está en texto plano solo para desarrollo inicial. Más adelante debe cambiarse por contraseña hasheada con bcrypt.

---

## Problemas encontrados y soluciones

### Error de PowerShell con `npx`

Error:

```txt
No se puede cargar el archivo npx.ps1 porque la ejecución de scripts está deshabilitada
```

Solución:

Abrir PowerShell como administrador y ejecutar:

```powershell
Set-ExecutionPolicy RemoteSigned
```

Luego responder:

```txt
Y
```

---

### Error de TypeScript con `verbatimModuleSyntax`

Se solucionó ajustando `tsconfig.json` para trabajar con módulos modernos de Node:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "Node16",
    "moduleResolution": "Node16",
    "rootDir": ".",
    "outDir": "./dist",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": false,
    "types": ["node"]
  },
  "include": ["src", "prisma"],
  "exclude": ["node_modules", "dist"]
}
```
---

## Estado actual

El backend base ya cuenta con:

- Express configurado.
- TypeScript configurado.
- Prisma conectado a PostgreSQL.
- Neon como base de datos cloud.
- Migración inicial aplicada.
- Modelos principales definidos.
- Módulos separados por dominio.
- Seed inicial preparado.
- Rutas base creadas.

---

## Notas personales

Este proyecto nace de la necesidad de controlar mejor el dinero mensual, separando gastos fijos, gastos variables, ahorro, hobbies, metas y dinero libre.

También funciona como proyecto de práctica fullstack para reforzar:

- Arquitectura backend.
- Modelado de datos.
- APIs REST.
- Prisma ORM.
- PostgreSQL.
- Next.js.
- Buenas prácticas de organización.