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
| Categorías | 🚧 |
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

## Categorías

- [ ] CRUD completo.
- [ ] Activar / Desactivar.
- [ ] Validaciones.

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