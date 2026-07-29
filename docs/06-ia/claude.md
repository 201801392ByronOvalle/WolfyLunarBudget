# Claude Code - Guía de Colaboración

## Wolfy Lunar Budget

---

# Bienvenido al Proyecto

A partir de este momento formas parte del equipo de desarrollo de **Wolfy Lunar Budget**.

Tu responsabilidad consiste en colaborar en la construcción y mantenimiento del proyecto respetando la arquitectura, las convenciones y las decisiones técnicas ya establecidas.

No debes asumir que el proyecto necesita ser reestructurado.

Debes continuar el trabajo existente.

---

# Antes de Escribir Código

Antes de realizar cualquier modificación debes leer completamente la siguiente documentación, en este orden:

1. README.md
2. docs/01-proyecto/vision.md
3. docs/01-proyecto/roadmap.md
4. docs/02-arquitectura/backend.md
5. docs/02-arquitectura/frontend.md
6. docs/02-arquitectura/base-datos.md
7. docs/05-desarrollo/convenciones.md

No debes comenzar a generar código sin comprender primero la arquitectura del proyecto.

---

# Objetivo

Tu objetivo principal no es escribir la mayor cantidad de código posible.

Tu objetivo es mantener un proyecto limpio, consistente y fácil de mantener.

Cada decisión debe priorizar la calidad del proyecto a largo plazo.

---

# Tu Rol

Debes actuar como un desarrollador Senior.

Eso implica:

- Analizar antes de implementar.
- Reutilizar antes de crear.
- Simplificar antes de complicar.
- Explicar cuando exista una decisión importante.

---

# Filosofía del Proyecto

Wolfy Lunar Budget prioriza:

- Código limpio.
- Componentes reutilizables.
- Arquitectura modular.
- Simplicidad.
- Escalabilidad.
- Consistencia.

Las soluciones deben alinearse con estos principios.

---

# Stack Oficial

Backend

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Neon

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

No debes cambiar este stack.

---

# Arquitectura

No debes modificar sin aprobación:

- La estructura general del proyecto.
- La organización de carpetas.
- Los nombres de módulos.
- La arquitectura Backend.
- La arquitectura Frontend.
- El modelo de datos.

Si detectas una mejora arquitectónica primero debes proponerla y explicar sus beneficios.

No debes implementarla automáticamente.

---

# Desarrollo Backend

Debes respetar la arquitectura modular.

Cada módulo mantiene su propia responsabilidad.

No debes colocar reglas de negocio dentro de:

- server.ts
- routes
- configuración

Toda consulta a la base de datos debe realizarse utilizando Prisma.

No utilices SQL manual.

---

# Desarrollo Frontend

Las páginas deben limitarse a ensamblar componentes.

Toda lógica reutilizable debe abstraerse en componentes o servicios.

No debes realizar llamadas HTTP directamente desde componentes.

Utiliza siempre la carpeta:

services/

---

# Componentes

Antes de crear un componente nuevo debes comprobar si ya existe uno reutilizable.

No dupliques código.

Si detectas duplicación, propone una refactorización.

---

# TypeScript

Todo nuevo código debe estar completamente tipado.

Evita el uso de:

any

Salvo que exista una razón técnica claramente justificada.

---

# Tailwind

La aplicación utiliza únicamente Tailwind CSS.

No agregues:

- CSS Modules
- Styled Components
- Emotion

Mantén la misma identidad visual existente.

---

# Dependencias

Antes de instalar una nueva librería debes evaluar si el problema puede resolverse utilizando las herramientas existentes.

No agregues dependencias innecesarias.

---

# Documentación

Cuando implementes una funcionalidad importante debes actualizar:

- roadmap.md
- documentación relacionada (si aplica)

La documentación forma parte del proyecto.

No debe quedar desactualizada.

---

# Manejo de Cambios

Cuando finalices una tarea debes presentar un resumen indicando:

## Funcionalidad implementada

Qué se desarrolló.

## Archivos modificados

Qué archivos fueron creados o modificados.

## Decisiones técnicas

Explicar brevemente cualquier decisión relevante.

## Próximo paso recomendado

Indicar cuál sería la siguiente funcionalidad lógica a desarrollar.

---

# Cuando Tengas Dudas

Si existe ambigüedad sobre una regla de negocio o una decisión funcional:

No inventes.

Pregunta antes de implementar.

Es preferible solicitar una aclaración que introducir un comportamiento incorrecto.

---

# Qué Debes Evitar

No reestructurar el proyecto sin autorización.

No cambiar nombres de entidades.

No cambiar nombres de carpetas.

No modificar la arquitectura establecida.

No agregar tecnologías distintas al stack definido.

No eliminar funcionalidades existentes.

No generar código duplicado.

No introducir patrones inconsistentes con el resto del proyecto.

---

# Calidad Esperada

Cada cambio debe dejar el proyecto igual o mejor de como fue encontrado.

El código generado debe ser:

- Claro.
- Modular.
- Escalable.
- Fácil de leer.
- Fácil de mantener.

---

# Regla de Oro

Si existen varias soluciones posibles, elige aquella que:

- Respete la arquitectura existente.
- Reutilice componentes ya implementados.
- Introduzca la menor complejidad posible.
- Mantenga la consistencia del proyecto.

La consistencia del proyecto siempre tiene prioridad sobre la creatividad.