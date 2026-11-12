# Roadmap del Proyecto

## Wolfy Lunar Budget

---

# Estado General

**Versión actual:** 0.1.0 (En desarrollo)

El proyecto se encuentra en la etapa de construcción de la arquitectura base. Actualmente ya se dispone de un backend funcional, una base de datos inicial y un frontend con la estructura principal de navegación.

---

# Progreso General

| Módulo | Estado |
|---------|:------:|
| Arquitectura Backend | ✅ |
| Arquitectura Frontend | ✅ |
| Base de Datos | ✅ |
| Dashboard | 🚧 |
| Movimientos | 🚧 |
| Cuentas | 🚧 |
| Categorías | ✅ Implementada · validación en base aislada pendiente |
| Metas | 🚧 |
| Presupuestos | ⏳ |
| Reportes | ⏳ |
| Autenticación | ⏳ |
| Deploy | ⏳ |

---

# Fase 1 - Arquitectura Base

## Backend

- [x] Configuración de Express.
- [x] Configuración de TypeScript.
- [x] Configuración de Prisma.
- [x] Configuración de Neon PostgreSQL.
- [x] Configuración de variables de entorno.
- [x] Estructura modular por dominios.
- [x] Endpoints iniciales.
- [x] Seed de datos.

## Base de Datos

- [x] Modelo Usuario.
- [x] Modelo Cuenta.
- [x] Modelo Categoría.
- [x] Modelo Movimiento.
- [x] Modelo Meta.
- [x] Modelo Presupuesto Mensual.

## Frontend

- [x] Configuración de Next.js.
- [x] Configuración de Tailwind CSS.
- [x] Layout principal.
- [x] Sidebar.
- [x] Dashboard inicial.
- [x] Navegación entre módulos.
- [x] Página base para Movimientos.
- [x] Página base para Cuentas.
- [x] Página base para Categorías.
- [x] Página base para Metas.
- [x] Página base para Reportes.

---

# Fase 2 - Gestión Financiera

## Dashboard

- [ ] Consumir información real desde la API.
- [ ] Mostrar indicadores financieros reales.
- [ ] Mostrar movimientos recientes reales.
- [ ] Mostrar progreso de metas.
- [ ] Mostrar resumen de cuentas.

## Movimientos

- [ ] Crear movimiento.
- [ ] Editar movimiento.
- [ ] Eliminar movimiento (borrado lógico).
- [ ] Buscar movimientos.
- [ ] Filtrar por fecha.
- [ ] Filtrar por categoría.
- [ ] Filtrar por cuenta.
- [ ] Ordenar movimientos.
- [ ] Paginación.

Ajustes de la feature 001-gestion-categorias (implementados; validación en base aislada pendiente):

- [x] Usuario determinado por el servidor (`CURRENT_USER_ID`); `USUId` opcional al crear.
- [x] Pertenencia del movimiento, la cuenta y la categoría al crear, editar y desactivar.
- [x] Correspondencia entre el tipo del movimiento y el de la categoría.
- [x] Conservación de categorías históricas (inactivas o de tipo incompatible) al editar.
- [x] Escritura solo de los campos que cambian.
- [x] Selectores de categoría filtrados por tipo, con aviso al limpiar la selección.

## Categorías

Feature `specs/001-gestion-categorias` (rama `feature/aowxkit-adoption`, commits locales sin push).

- [x] Consultar categorías del usuario actual, activas e inactivas.
- [x] Crear categoría.
- [x] Editar categoría (sin eliminación física).
- [x] Activar / Desactivar.
- [x] Validaciones (nombre, tipo, color, ícono y unicidad por tipo y nombre normalizado).
- [x] Diagnóstico de solo lectura de duplicados históricos.
- [ ] Validación de integración en una base PostgreSQL aislada (ver "Pendientes de la feature 001").

## Cuentas

- [ ] CRUD completo.
- [ ] Saldo actual.
- [ ] Activar / Desactivar.

## Metas

- [ ] CRUD completo.
- [ ] Seguimiento de progreso.
- [ ] Aportes automáticos.

## Presupuestos

- [ ] CRUD completo.
- [ ] Comparación presupuesto vs gasto real.

---

# Fase 3 - Reportes

- [ ] Reporte mensual.
- [ ] Reporte anual.
- [ ] Gastos por categoría.
- [ ] Evolución del ahorro.
- [ ] Balance general.
- [ ] Exportación a PDF.
- [ ] Exportación a Excel.

---

# Fase 4 - Seguridad

- [ ] Login.
- [ ] Logout.
- [ ] Hash de contraseñas.
- [ ] JWT.
- [ ] Middleware de autenticación.
- [ ] Protección de rutas.
- [ ] Renovación de sesión.

---

# Fase 5 - Calidad

- [ ] Pruebas unitarias.
- [ ] Pruebas de integración.
- [ ] Documentación técnica completa.
- [ ] Optimización del frontend.
- [ ] Optimización del backend.
- [ ] Preparación para producción.

---

# Pendientes de la feature 001-gestion-categorias

## Excepción del Principio VII (abierta hasta resolver DA-06)

Las pruebas automatizadas usan un doble de Prisma y no se conectan a ninguna base, por lo que no
demuestran el comportamiento real de PostgreSQL (aislamiento `Serializable`, `P2034`/`40001`,
`P2028`, tiempos de Neon). Mientras no exista un entorno de base aislado (DA-06), esa parte se cubre
con verificaciones manuales que **todavía no se han ejecutado**:

- [ ] Arranque A1–A5 (`quickstart.md` §2): A1 solo lee; A2–A5 con cambios temporales de la
      configuración local, restaurados al terminar.
- [ ] Casos M1–M10 y regresión de Movimientos §4, **solo en una base aislada**, nunca en la base Neon
      actual. En M7 anotar la forma del error de serialización observado.
- [ ] M11: observación de usabilidad SC-001 en la base aislada.
- [x] Revisión de `/movimientos` con la API real, sin guardar datos (T062), el 2026-11-12 en una base
      PostgreSQL local aislada. Detectó la incidencia I-1 (desbordamiento a 360 px con montos
      largos), corregida en `1e7969d`
      (`specs/001-gestion-categorias/verificacion-manual.md`).

Cuando se resuelva DA-06, estos casos deberían automatizarse como pruebas de integración.

## Riesgos residuales aceptados

| Riesgo | Descripción | Estado |
|---|---|---|
| R-4 | Un cambio de tipo de categoría concurrente con el alta de un movimiento con esa categoría podría dejar un movimiento cuyo tipo no corresponde. | Abierto; probabilidad muy baja con un solo usuario. |
| R-6 | `GET` de movimientos, cuentas, usuarios, metas y presupuestos devuelve datos de todos los usuarios. | Abierto; requiere una spec de aislamiento multiusuario o autenticación. |
| R-7 | Editar un movimiento cuya cuenta está inactiva sigue respondiendo 409, porque la web reenvía `CUEId`. | Abierto; comportamiento previo, fuera de la spec. |
| R-8 | El Dashboard muestra como "usuario conectado" al primero de la lista. | Abierto; fuera de alcance. |
| R-9 | Formas Unicode distintas (NFC/NFD) del mismo nombre no se detectan como duplicado. | Abierto; la spec no define normalización Unicode. |
| R-10 | Un usuario borrado fuera de la API después del arranque provoca respuestas 500 hasta reiniciar, y entonces la API no arranca. | Abierto; no existe endpoint que borre usuarios. |
| R-12 | Las operaciones con `$transaction` pueden responder 500 por `P2028` si Neon tarda más de `maxWait` (5 s) en reanudarse o la transacción supera `timeout` (10 s). | Abierto; sin reintento por diseño; verificar con M10. |
| R-13 | `transactionOptions` en el constructor de `PrismaClient`. | Mitigado: verificado en los tipos de Prisma 6 instalado (T014) y con prueba unitaria. |

Otros riesgos del plan: R-1 (D3 deja sin servicio toda la API si `CURRENT_USER_ID` es inválido) y R-2
(clientes antiguos que envían otro `USUId` reciben 400) son decisiones aceptadas; R-3 y R-5 dependen
de la validación en base aislada; R-11 (`npm run build` modifica `api/dist/` versionado) y R-14
(`.specify/feature.json`) se controlan excluyéndolos de los commits.

---

# Futuras Mejoras

Estas funcionalidades no forman parte del MVP, pero se consideran posibles evoluciones del proyecto.

- Multiusuario.
- Cuentas compartidas.
- Integración bancaria.
- Aplicación móvil.
- Notificaciones.
- Recordatorios de pagos.
- Metas inteligentes.
- Presupuestos automáticos.
- Dashboard avanzado.
- Gráficas financieras.
- Modo oscuro / claro.
- Soporte para múltiples monedas.

---

# Última Actualización

| Fecha | Descripción |
|--------|-------------|
| 29/07/2026 | Se completó la arquitectura base del backend y frontend. Se documentó la visión y el roadmap inicial del proyecto. |
| 12/11/2026 | Se implementó la gestión de categorías (feature 001) y sus ajustes en Movimientos, con pruebas automatizadas sobre un doble de Prisma. Queda pendiente la validación en una base PostgreSQL aislada. |