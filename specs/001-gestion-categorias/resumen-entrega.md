# Resumen de entrega — 001-gestion-categorias

**Fecha**: 2026-11-12 · **Rama**: `feature/aowxkit-adoption` · **Constitución**: v1.3.0
**Estado**: implementada y verificada con pruebas automatizadas sobre un doble de Prisma.
**No validada contra PostgreSQL real**: faltan los casos manuales en una base aislada (sección 6).
Commits locales, sin push.

## 1. Funcionalidad entregada

- **Categorías** (`/categorias`): consultar las del usuario actual (activas e inactivas), crear,
  editar, desactivar y activar sin eliminación física; validación de nombre, tipo, color e ícono;
  unicidad por usuario, tipo y nombre normalizado (incluidas inactivas); diagnóstico de solo lectura
  de duplicados históricos.
- **Usuario actual** determinado por el servidor con `CURRENT_USER_ID`, verificado al arrancar (la API
  no arranca si es inválido: 78 configuración, 69 conexión, 1 otro). No es autenticación.
- **Movimientos**: pertenencia del movimiento, la cuenta y la categoría al crear, editar y desactivar;
  correspondencia entre tipos; conservación de categorías históricas; escritura solo de los campos
  que cambian; selectores filtrados por tipo con aviso al limpiar la selección.

## 2. Archivos

**Creados**

- API: `src/app.ts`, `src/lib/usuario-actual.ts`, `src/modules/categorias/categorias.rules.ts`,
  `vitest.config.ts`, `tsconfig.test.json`, `tests/` (setup, `support/`, 3 archivos unitarios y
  6 HTTP).
- Web: `components/categorias/CategoryForm.tsx`, `components/categorias/CategoriesTable.tsx`,
  `vitest.config.ts`, `tests/categorias.service.test.ts`.
- Spec Kit y gobierno: `specs/001-gestion-categorias/` completo, Constitución v1.3.0, configuración
  compartida de `.claude/` y `.specify/` (sin `feature.json` ni `settings.local.json`).

**Modificados**

- API: `src/server.ts`, `src/config/env.ts`, `src/lib/prisma.ts`, controlador y rutas de
  `categorias/`, controlador de `movimientos/`, `package.json` (Vitest y scripts).
- Web: `app/categorias/page.tsx`, `services/categorias.service.ts`, `types/categoria.ts`,
  `types/movimiento.ts`, `components/movimientos/CreateMovementForm.tsx`,
  `components/movimientos/MovementsTable.tsx`, `package.json`.
- Documentación: `README.md`, `docs/CHANGELOG.md`, `docs/01-proyecto/roadmap.md`,
  `docs/02-arquitectura/backend.md`, `docs/02-arquitectura/frontend.md`,
  `docs/06-ia/prompt-maestro.md`.

Sin cambios en `api/prisma/` (esquema, migraciones ni seed) ni en `api/dist/`.

## 3. Decisiones

- D1–D4 del plan; D3 revisada: la API no arranca sin un `CURRENT_USER_ID` válido.
- Q5 / FR-026 y Principio V (v1.2.0): las reglas se evalúan solo sobre lo que cambia y las ediciones
  escriben solo esos campos.
- Unicidad sin `UNIQUE`: transacción `Serializable` con hasta 3 intentos ante `P2034`/`40001`;
  `P2028` → 500 sin reintento.
- `transactionOptions` globales: `maxWait` 5000 ms, `timeout` 10000 ms.
- Vitest como herramienta de pruebas (DA-03 cerrada, Principio VII).
- H2: los casos que escriben datos solo se ejecutan en una base aislada, nunca en la Neon actual.
- `filtrarCategoriasParaMovimiento` recibe un cuarto parámetro opcional (`tipoPersistido`) para
  saber si el usuario cambió el tipo en la edición.

## 4. Validaciones automáticas ejecutadas

| Puerta | Resultado |
|---|---|
| `api/` `npm test` | 235/235 en 9 archivos |
| `api/` `npm run typecheck` y `npx tsc --noEmit` | Sin errores |
| `api/` build (`tsc`) | Sin errores; compilado con `--outDir` en una carpeta temporal para no modificar `api/dist/` versionado (DA-08, R-11) |
| `web/` `npx tsc --noEmit`, `npm run lint` | Sin errores |
| `web/` `npm test` | 7/7 |
| `web/` `npm run build` | Correcto (Next.js 16.2.6) |
| Revisiones estáticas (T070) | Sin hallazgos |

Las pruebas usan un doble de Prisma y `DATABASE_URL` en un host `.invalid`; no demuestran
aislamiento, concurrencia ni tiempos reales de PostgreSQL.

## 5. Riesgos residuales

R-4, R-6, R-7, R-8, R-9, R-10 y R-12 abiertos y aceptados; R-1 y R-2 son decisiones aceptadas; R-3 y
R-5 dependen de la validación en base aislada; R-11 y R-14 se controlan excluyendo `api/dist/` y
`.specify/feature.json` de los commits; R-13 mitigado. Detalle en `docs/01-proyecto/roadmap.md`.

## 6. Verificaciones manuales pendientes (requieren PostgreSQL aislado)

No se ejecutaron: esta computadora no tiene conexión con Neon y todavía no existe una base aislada
(DA-06). **Ningún caso que escribe datos se ejecuta en la base Neon actual.**

Preparación (la hace Andrés):

1. Crear una base aislada: una rama de Neon o un PostgreSQL local sin datos financieros reales.
2. Aplicar el esquema existente sobre esa base y cargar datos de prueba, incluidos duplicados
   históricos (por ejemplo "Comida" y "comida " de tipo `gasto`) y un movimiento con categoría
   inactiva y otro con categoría de tipo incompatible.
3. En una copia local de la configuración de la API, apuntar `DATABASE_URL` a esa base y fijar
   `CURRENT_USER_ID` a un usuario de prueba. No publicar los valores.

Lista de comprobación:

- [x] **A1–A5** (verificados el 2026-11-12 en PostgreSQL local, ver `verificacion-manual.md`)
      (`quickstart.md` §2, T071): arranque válido, falta, formato, usuario inexistente y host
      inalcanzable (códigos 78/69); la consola nunca muestra valores.
- [x] **T062** (verificada el 2026-11-12 en PostgreSQL local; incidencia I-1 corregida en `1e7969d`, ver
      `verificacion-manual.md`): `/movimientos` con la API real, sin guardar: filtro por tipo, aviso al cambiar el
      tipo, categoría histórica marcada en edición y cancelar.
T072 ejecutada el 2026-11-12 en PostgreSQL local (detalle en `verificacion-manual.md`):

- [x] **M1–M3**: crear, rechazo de duplicado normalizado, desactivar sin que aparezca en movimientos
      nuevos.
- [x] **M4–M5**: conservar una categoría inactiva al editar; cambiar el tipo (409/400 si se fuerza por
      API).
- [x] **M6**: rechazo del cambio de tipo con movimientos asociados. **Defecto abierto D-1**: reenviar
      un nombre histórico con espacios alrededor, sin cambiarlo, responde 409.
- [x] **M7**: dos `POST` simultáneos → 201 + 409; la forma observada es `P2034`, que reconoce
      `esErrorDeSerializacion`.
- [x] **M8**: pantallas a 360 px con datos reales.
- [x] **M9**: diagnóstico de duplicados sin cambios en el recuento de filas.
- [ ] **M10**: verificado el `timeout` (500 genérico + `P2028`, sin cambios); **pendientes** la
      suspensión del compute y `maxWait`, no reproducibles en PostgreSQL local.
- [x] **§4 regresión de Movimientos** (SC-006): registrar, editar y desactivar con y sin categoría.
- [ ] **M11** (T073): cronometrar la creación de una categoría desde `/categorias`.

Registrar la evidencia en el PR, sin valores de configuración.

## 7. Commits locales (Constitución X, sin push)

| Hash | Commit |
|---|---|
| `4018fef` | chore(config): Configurar Vitest en la API y en la web |
| `85d418b` | feat(backend): Agregar fundamentos de usuario actual, app y reglas de categorías |
| `fc311fd` | feat(backend): Agregar consulta, diagnóstico de duplicados y creación de categorías |
| `89b217a` | feat(frontend): Agregar listado y creación de categorías |
| `7ff2fa3` | docs(spec): Agregar especificación, plan y tareas de Gestión de Categorías |
| `f69ccfa` | docs(spec): Versionar la Constitución v1.3.0 de LunarBudget |
| `0ba25ad` | chore(config): Versionar la configuración compartida de Spec Kit y Claude Code |
| `ad43782` | feat(backend): Agregar edición de categorías |
| `93b1a36` | feat(frontend): Agregar edición de categorías |
| `7d9422e` | docs(spec): Marcar como completadas las tareas de US3 |
| `c97cf1c` | feat(backend): Agregar activación y desactivación de categorías |
| `1267101` | feat(frontend): Agregar activación y desactivación de categorías |
| `6fdbfcc` | docs(spec): Marcar como completadas las tareas de US4 |
| `91cf199` | feat(backend): Validar pertenencia y categorías en Movimientos |
| `fd4b0f7` | feat(frontend): Filtrar categorías por tipo en Movimientos |
| `977b48d` | docs(spec): Marcar como completadas las tareas automatizadas de US5 |
| `7a1bcc8` | docs(spec): Documentar la gestión de categorías y los ajustes de Movimientos |

El commit que agrega este resumen y marca las tareas de la fase final se crea a continuación.
Ninguno incluye `.env`, `.specify/feature.json`, `.claude/settings.local.json`,
`.claude/launch.json` ni `api/dist/`.
