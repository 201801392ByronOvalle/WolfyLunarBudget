# Convenciones de Desarrollo

## Wolfy Lunar Budget

---

# Objetivo

Este documento define los estándares de desarrollo que deben seguir todos los colaboradores del proyecto.

El propósito es mantener un código consistente, mantenible y fácil de comprender independientemente de quién implemente una funcionalidad.

Estas convenciones aplican tanto para desarrolladores humanos como para asistentes de inteligencia artificial.

---

# Principios Generales

Durante el desarrollo deberán respetarse los siguientes principios:

- Simplicidad.
- Código limpio.
- Reutilización.
- Legibilidad.
- Separación de responsabilidades.
- Bajo acoplamiento.
- Alta cohesión.

Siempre deberá priorizarse un código fácil de entender sobre uno excesivamente complejo.

---

# Lenguaje

Todo el proyecto debe desarrollarse utilizando:

- TypeScript.

No se permite utilizar JavaScript para nuevas funcionalidades.

---

# Tipado

El proyecto debe ser completamente tipado.

Se deben utilizar:

- Interfaces.
- Types cuando sea apropiado.
- Tipos explícitos.

Debe evitarse el uso de:

```typescript
any
```

Solo podrá utilizarse cuando exista una justificación técnica documentada.

---

# Organización del Backend

Cada módulo debe mantenerse independiente.

Ejemplo:

```text
movimientos/

movimientos.controller.ts

movimientos.routes.ts
```

En futuras versiones podrán agregarse:

```text
movimientos.service.ts

movimientos.repository.ts

dto/

validators/
```

No deben mezclarse responsabilidades entre módulos.

---

# Organización del Frontend

Cada módulo tendrá su propia carpeta de componentes.

Ejemplo:

```text
components/

movimientos/

CreateMovementForm.tsx

MovementsTable.tsx

MovementFilters.tsx
```

No deben colocarse componentes de un módulo dentro de otro.

---

# Componentes

Los componentes deben ser:

- Pequeños.
- Reutilizables.
- Responsables de una única función.

Debe evitarse crear componentes excesivamente grandes.

Si un componente comienza a asumir demasiadas responsabilidades deberá dividirse.

---

# Páginas

Las páginas (`page.tsx`) deben contener únicamente:

- Composición de componentes.
- Organización visual.

No deben contener:

- Consultas HTTP.
- Lógica compleja.
- Reglas del negocio.

---

# Servicios

Toda comunicación con la API debe realizarse mediante la carpeta:

```text
services/
```

No debe utilizarse `fetch()` directamente dentro de componentes o páginas.

Ejemplo:

```typescript
services/

movimientos.service.ts

cuentas.service.ts
```

---

# Modelos

Las interfaces compartidas deben almacenarse en:

```text
types/
```

No deben declararse interfaces duplicadas dentro de componentes.

---

# Estilos

El proyecto utiliza exclusivamente:

- Tailwind CSS.

No deben utilizarse:

- CSS Modules.
- Styled Components.
- Emotion.

Toda nueva interfaz debe mantener el mismo estilo visual existente.

---

# Colores

Los colores deben mantener coherencia en toda la aplicación.

Ejemplo:

Ingreso

- Verde

Gasto

- Rojo

Ahorro

- Azul

Información secundaria

- Gris

Color principal del proyecto

- Violeta

---

# Nombres

Los nombres deben ser descriptivos.

Ejemplos:

```text
CreateMovementForm

MovementsTable

AccountsOverview

GoalsOverview
```

Evitar nombres genéricos como:

```text
Component

Table

Data

Helper
```

---

# Variables

Las variables deben utilizar nombres descriptivos.

Correcto:

```typescript
monthlyIncome
currentBalance
selectedCategory
```

Incorrecto:

```typescript
x
a
temp
data2
```

---

# Funciones

Cada función debe realizar una única tarea.

Las funciones excesivamente grandes deberán dividirse.

Siempre que sea posible deberán mantenerse puras.

---

# Reutilización

Antes de crear un nuevo componente debe verificarse si ya existe uno que pueda reutilizarse.

Debe evitarse duplicar código.

---

# Dependencias

No deben agregarse nuevas librerías sin una necesidad justificada.

Siempre deberá preferirse una solución utilizando las herramientas ya existentes.

---

# Arquitectura

No deben modificarse sin aprobación:

- La estructura de carpetas.
- Los nombres de módulos.
- La arquitectura general.
- El modelo de datos.
- La estrategia de navegación.

Las mejoras arquitectónicas deberán proponerse antes de implementarse.

---

# Base de Datos

Todas las consultas deberán realizarse mediante Prisma.

No deben escribirse consultas SQL manuales dentro de la aplicación.

Toda modificación del esquema deberá realizarse mediante migraciones.

---

# Documentación

Toda funcionalidad importante deberá reflejarse en la documentación correspondiente.

Cuando una tarea finalice deberán actualizarse:

- roadmap.md
- documentación técnica relacionada (si aplica)

---

# Calidad del Código

Todo nuevo código deberá cumplir con los siguientes criterios:

- Fácil de leer.
- Fácil de mantener.
- Fácil de extender.
- Tipado.
- Modular.
- Consistente con el resto del proyecto.

---

# Regla Principal

Cuando existan varias soluciones posibles deberá elegirse aquella que:

- Sea más clara.
- Sea más mantenible.
- Reutilice más componentes.
- Respete la arquitectura existente.

La consistencia del proyecto tiene prioridad sobre las preferencias personales del desarrollador.