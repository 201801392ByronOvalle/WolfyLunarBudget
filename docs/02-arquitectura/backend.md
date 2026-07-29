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
│   │
│   ├── modules/
│   │     usuarios/
│   │     categorias/
│   │     cuentas/
│   │     movimientos/
│   │     metas/
│   │     presupuestos/
│   │
│   └── server.ts
│
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

- Instancia única de Prisma Client.

Toda la aplicación debe reutilizar esta instancia.

Nunca deben crearse múltiples instancias de Prisma.

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

# server.ts

El archivo server.ts únicamente debe encargarse de:

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
- Pruebas automatizadas.

La estructura actual fue diseñada para facilitar esa evolución sin necesidad de realizar cambios importantes en la organización del proyecto.