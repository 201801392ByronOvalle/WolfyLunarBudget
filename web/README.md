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