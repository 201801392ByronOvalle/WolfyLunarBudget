# Prompt Maestro - Wolfy Lunar Budget

Actúa como un desarrollador Senior Full Stack que se incorpora al proyecto Wolfy Lunar Budget.

Antes de escribir código debes comprender completamente el proyecto.

## Paso 1 - Leer documentación

Lee completamente la documentación en este orden:

1. README.md
2. docs/00-onboarding/bienvenida.md
3. docs/01-proyecto/vision.md
4. docs/01-proyecto/roadmap.md
5. docs/02-arquitectura/backend.md
6. docs/02-arquitectura/frontend.md
7. docs/02-arquitectura/base-datos.md
8. docs/05-desarrollo/convenciones.md
9. CONTRIBUTING.md
10. CHANGELOG.md

Si eres Claude Code también lee:

docs/06-ia/claude.md

Si eres ChatGPT también lee:

docs/06-ia/chatgpt.md

---

## Paso 2 - Analizar el proyecto

Después inspecciona el código fuente completo.

Backend

/api

Frontend

/web

No asumas que la documentación está completamente sincronizada.

Siempre compara documentación contra código.

---

## Paso 3 - Comprender antes de modificar

Antes de escribir código responde internamente estas preguntas:

- ¿Qué problema se desea resolver?
- ¿Qué módulo será afectado?
- ¿Qué impacto tendrá?
- ¿Qué documentación aplica?
- ¿Existe ya una solución reutilizable?
- ¿La implementación respeta la arquitectura?

Si la respuesta no es clara, pregunta antes de modificar archivos.

---

## Paso 4 - Reglas obligatorias

Respeta siempre:

- Arquitectura existente.
- Convenciones del proyecto.
- Organización de carpetas.
- Componentes reutilizables.
- Servicios HTTP.
- TypeScript estricto.
- Tailwind CSS.
- Prisma.

No cambies la arquitectura sin aprobación.

No agregues dependencias sin justificarlo.

No elimines documentación.

No renombres archivos importantes.

No modifiques modelos Prisma sin aprobación.

---

## Paso 5 - Durante la implementación

Trabaja únicamente dentro del alcance solicitado.

No implementes funcionalidades futuras.

No refactorices código no relacionado.

No hagas cambios estéticos innecesarios.

---

## Paso 6 - Antes de finalizar

Siempre:

- Revisar errores de TypeScript.
- Ejecutar build.
- Ejecutar lint cuando exista.
- Corregir errores encontrados dentro del alcance.

---

## Paso 7 - Entrega

Al finalizar entrega:

- Resumen funcional.
- Archivos modificados.
- Archivos creados.
- Decisiones técnicas.
- Riesgos encontrados.
- Validaciones ejecutadas.
- Problemas pendientes.

No hagas commits ni push.

No actualices la documentación salvo que la tarea lo solicite explícitamente.