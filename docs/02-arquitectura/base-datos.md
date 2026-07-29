# Arquitectura de Base de Datos

## Wolfy Lunar Budget

---

# Objetivo

La base de datos de Wolfy Lunar Budget tiene como propósito almacenar de forma segura y consistente toda la información financiera del sistema.

El modelo fue diseñado para representar las principales entidades del presupuesto personal manteniendo relaciones simples, escalables y fáciles de mantener.

---

# Motor de Base de Datos

El proyecto utiliza:

- PostgreSQL
- Neon PostgreSQL (Cloud)

El acceso a la base de datos se realiza exclusivamente mediante Prisma ORM.

---

# ORM

Se utiliza Prisma como capa de acceso a datos.

Responsabilidades de Prisma:

- Modelado de entidades.
- Migraciones.
- Generación del cliente.
- Consultas tipadas.
- Relaciones entre entidades.

No deben realizarse consultas SQL manuales dentro de la aplicación.

---

# Convención de Nombres

En el código fuente se utilizan nombres amigables para las entidades.

Ejemplo:

```text
Usuario
Cuenta
Movimiento
Categoria
Meta
PresupuestoMensual
```

En PostgreSQL todas las tablas utilizan el prefijo:

```text
WLB_
```

Ejemplo:

```text
WLB_USUARIO
WLB_CUENTA
WLB_MOVIMIENTO
```

Esta convención permite identificar fácilmente las tablas pertenecientes al proyecto.

---

# Modelo de Datos

Actualmente el sistema está compuesto por las siguientes entidades.

## Usuario

Representa al propietario del presupuesto.

Información principal:

- Nombre
- Correo electrónico
- Contraseña
- Fecha de creación

Un usuario puede poseer múltiples:

- Cuentas
- Movimientos
- Metas
- Presupuestos

---

## Cuenta

Representa un lugar donde existe dinero disponible.

Ejemplos:

- Cuenta bancaria.
- Cuenta de ahorro.
- Efectivo.
- Tarjeta.
- Fondo de inversión.

Cada movimiento pertenece a una única cuenta.

---

## Categoría

Permite clasificar los movimientos.

Ejemplos:

- Salario.
- Comida.
- Transporte.
- Servicios.
- Libros.
- Juegos.
- Emergencias.

Una categoría puede utilizarse en múltiples movimientos.

---

## Movimiento

Representa cualquier operación financiera registrada.

Puede corresponder a:

- Ingreso.
- Gasto.
- Ahorro.

Es la entidad principal del sistema.

Cada movimiento pertenece a:

- Un usuario.
- Una cuenta.
- Una categoría.

---

## Meta

Representa un objetivo financiero.

Ejemplos:

- Viaje.
- Compra de vehículo.
- Fondo de emergencia.
- Inversión.

Las metas permiten dar seguimiento al progreso del ahorro.

---

## Presupuesto Mensual

Define el monto máximo esperado para una categoría durante un mes específico.

Posteriormente permitirá comparar:

Presupuesto

vs

Gasto real

---

# Relaciones

Las relaciones principales del modelo son las siguientes.

```text
Usuario
│
├── Cuenta
│
├── Movimiento
│
├── Meta
│
└── PresupuestoMensual

Movimiento
│
├── Cuenta
│
└── Categoria
```

---

# Tablas Actuales

```text
WLB_USUARIO

WLB_CUENTA

WLB_CATEGORIA

WLB_MOVIMIENTO

WLB_META

WLB_PRESUPUESTO_MENSUAL
```

---

# Migraciones

Toda modificación del modelo debe realizarse mediante Prisma Migrate.

Nunca deben modificarse tablas directamente en producción.

Flujo recomendado:

1. Modificar schema.prisma.
2. Ejecutar migración.
3. Generar Prisma Client.
4. Validar funcionamiento.
5. Registrar el cambio en el repositorio.

---

# Seed

El proyecto dispone de un seed inicial que crea información básica para desarrollo.

Incluye:

## Usuario

- admin@wolfylunar.com

## Cuentas

- BI Sueldo
- BAC Ahorro General
- BAC Viaje
- Gastos y Hobbies

## Categorías

- Salario
- Ahorro
- Comida
- Transporte
- Servicios
- Libros
- Juegos
- Salidas
- Emergencias

## Metas

- Viaje a México
- Carro
- Inversión a plazo fijo

El seed tiene como objetivo facilitar las pruebas durante el desarrollo.

---

# Principios del Modelo

El diseño de la base de datos busca cumplir los siguientes principios.

- Simplicidad.
- Integridad de la información.
- Escalabilidad.
- Bajo acoplamiento.
- Consistencia.
- Facilidad de mantenimiento.

---

# Evolución Esperada

En futuras versiones podrán incorporarse nuevas entidades como:

- Recordatorios.
- Auditoría.
- Configuración.
- Etiquetas.
- Archivos adjuntos.
- Historial de cambios.
- Monedas.
- Tipos de cambio.

La arquitectura actual permite incorporar estas entidades sin afectar el diseño principal del sistema.