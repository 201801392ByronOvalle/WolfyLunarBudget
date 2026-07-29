# Contribuir a Wolfy Lunar Budget

¡Gracias por tu interés en contribuir a Wolfy Lunar Budget!

Este documento describe las reglas y recomendaciones para mantener un proyecto consistente, limpio y fácil de mantener.

---

# Filosofía

Wolfy Lunar Budget prioriza:

- Código limpio.
- Arquitectura modular.
- Simplicidad.
- Componentes reutilizables.
- Buenas prácticas.
- Documentación actualizada.

Toda contribución debe respetar estos principios.

---

# Antes de Comenzar

Antes de implementar cualquier cambio revisa la documentación del proyecto.

Orden recomendado:

1. docs/00-onboarding/bienvenida.md
2. README.md
3. docs/01-proyecto/
4. docs/02-arquitectura/
5. docs/05-desarrollo/

---

# Flujo de Trabajo

Toda nueva funcionalidad debería seguir este proceso:

1. Revisar el Roadmap.
2. Diseñar la solución.
3. Implementar.
4. Validar.
5. Actualizar la documentación.
6. Actualizar el Roadmap.

---

# Estándares de Código

Backend

- TypeScript.
- Express.
- Prisma.
- Arquitectura modular.

Frontend

- Next.js App Router.
- TypeScript.
- Tailwind CSS.

---

# Convenciones

Respetar las reglas descritas en:

docs/05-desarrollo/convenciones.md

No modificar la arquitectura sin aprobación.

No duplicar código.

No introducir dependencias innecesarias.

---

# Documentación

Toda funcionalidad importante debe reflejarse en:

- roadmap.md
- documentación técnica relacionada

La documentación forma parte del proyecto.

---

# Commits

Se recomienda utilizar mensajes descriptivos.

Ejemplos:

feat: agregar CRUD de movimientos

fix: corregir cálculo del saldo mensual

docs: actualizar arquitectura frontend

refactor: simplificar componente MovementsTable

---

# Pull Requests

Todo Pull Request debería incluir:

- Objetivo del cambio.
- Archivos modificados.
- Evidencia de funcionamiento.
- Impacto esperado.

---

# Calidad Esperada

Cada contribución debe dejar el proyecto en un mejor estado del que fue encontrado.

Antes de dar una tarea por terminada pregúntate:

- ¿El código es fácil de entender?
- ¿Es reutilizable?
- ¿Respeta la arquitectura?
- ¿Está documentado?
- ¿Puede mantenerse fácilmente?