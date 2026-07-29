# Arquitectura Frontend

## Wolfy Lunar Budget

---

# Objetivo

El frontend de Wolfy Lunar Budget tiene como objetivo proporcionar una interfaz moderna, intuitiva y mantenible para la administración del presupuesto personal.

La arquitectura está diseñada para favorecer la reutilización de componentes, la separación de responsabilidades y una experiencia de usuario consistente en todos los módulos del sistema.

---

# Stack Tecnológico

El frontend utiliza las siguientes tecnologías:

- Next.js
- React
- TypeScript
- Tailwind CSS

El proyecto utiliza el **App Router** de Next.js como base para la navegación y organización de las páginas.

---

# Arquitectura General

La aplicación está organizada en módulos funcionales.

Cada módulo representa una sección del sistema y posee su propia página dentro del directorio `app`.

Actualmente existen los siguientes módulos:

- Dashboard
- Movimientos
- Cuentas
- Categorías
- Metas
- Reportes

Cada módulo evoluciona de manera independiente manteniendo una experiencia visual consistente.

---

# Estructura del Proyecto

```text
web/
│
├── app/
│   ├── categorias/
│   ├── cuentas/
│   ├── metas/
│   ├── movimientos/
│   ├── reportes/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── dashboard/
│   ├── layout/
│   └── movimientos/
│
├── services/
│
├── types/
│
├── public/
│
└── package.json
```

---

# Responsabilidad de cada carpeta

## app/

Contiene todas las páginas del sistema.

Cada carpeta representa una ruta de la aplicación.

Ejemplo:

```text
/movimientos

/cuentas

/categorias

/metas

/reportes
```

Las páginas deben contener la menor cantidad posible de lógica.

Su responsabilidad principal es ensamblar componentes.

---

## components/

Contiene todos los componentes reutilizables.

Los componentes se organizan por dominio funcional.

Ejemplo:

```text
components/

dashboard/

movimientos/

layout/
```

Los componentes deben ser reutilizables siempre que sea posible.

---

## services/

Contiene todas las llamadas HTTP hacia el backend.

Las páginas y componentes nunca deben realizar llamadas utilizando `fetch()` directamente.

Toda comunicación con la API debe centralizarse en esta carpeta.

Ejemplo:

```text
services/

api.ts

usuarios.service.ts

movimientos.service.ts

cuentas.service.ts
```

---

## types/

Contiene las interfaces y tipos compartidos.

Toda estructura de datos utilizada por la aplicación debe definirse aquí.

Ejemplo:

```typescript
Usuario

Movimiento

Cuenta

Categoria

Meta
```

---

## public/

Contiene recursos estáticos utilizados por la aplicación.

Ejemplos:

- Imágenes.
- Íconos.
- Logos.

---

# Componentes de Layout

La aplicación utiliza componentes reutilizables para mantener una experiencia uniforme.

Actualmente existen:

## AppShell

Responsable de la estructura principal de la aplicación.

Incluye:

- Sidebar.
- Área principal de contenido.

Todas las páginas del sistema deben utilizar este componente.

---

## AppSidebar

Contiene la navegación principal entre módulos.

Debe mantenerse como una única fuente de navegación.

Toda nueva funcionalidad deberá integrarse aquí cuando corresponda.

---

## PageHeader

Componente reutilizable para los encabezados de cada página.

Permite mostrar:

- Eyebrow.
- Título.
- Descripción.

Todas las páginas deben utilizar este componente para mantener consistencia visual.

---

# Dashboard

El Dashboard representa un resumen general del estado financiero.

No debe contener funcionalidades CRUD.

Su objetivo es visualizar información consolidada.

Actualmente contiene:

- Tarjetas resumen.
- Movimientos recientes.
- Resumen de cuentas.
- Metas financieras.

En futuras versiones consumirá datos reales desde la API.

---

# Organización por Módulos

Cada módulo podrá disponer de su propia carpeta de componentes.

Ejemplo:

```text
components/

movimientos/

CreateMovementForm.tsx

MovementsTable.tsx

MovementFilters.tsx

MovementModal.tsx
```

La misma organización podrá aplicarse a los demás módulos.

---

# Consumo de API

Toda llamada al backend debe realizarse mediante la carpeta `services`.

La URL base se configura mediante variables de entorno.

Ejemplo:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

El frontend nunca debe conocer rutas absolutas.

---

# Manejo de Estado

Actualmente la aplicación utiliza el estado local de React.

Conforme el proyecto evolucione podrá evaluarse la incorporación de una librería especializada para manejo de estado global si resulta necesario.

Hasta ese momento deberá priorizarse la simplicidad.

---

# Diseño Visual

La interfaz sigue una estética moderna basada en:

- Fondo oscuro.
- Tarjetas con bordes redondeados.
- Espaciado consistente.
- Tipografía clara.
- Colores diferenciados para ingresos, gastos y ahorro.

El objetivo es ofrecer una experiencia limpia y enfocada en la lectura de la información financiera.

---

# Principios de Desarrollo

Durante el desarrollo del frontend deberán mantenerse los siguientes principios:

- Componentes reutilizables.
- Responsabilidad única.
- Código tipado mediante TypeScript.
- Diseño consistente.
- Bajo acoplamiento.
- Separación entre presentación y acceso a datos.

---

# Convenciones

- Utilizar únicamente TypeScript.
- Evitar el uso de `any`.
- Reutilizar componentes existentes antes de crear nuevos.
- Mantener nombres descriptivos para componentes.
- No duplicar lógica.
- No realizar llamadas HTTP directamente desde componentes.
- Mantener la estructura de carpetas establecida.

---

# Evolución Esperada

Conforme el sistema crezca se incorporarán nuevas funcionalidades como:

- Formularios avanzados.
- Filtros dinámicos.
- Gráficas financieras.
- Paginación.
- Exportación de información.
- Modo claro.
- Mejoras de accesibilidad.
- Optimización de rendimiento.

La arquitectura actual fue diseñada para permitir esta evolución sin afectar la organización general del proyecto.