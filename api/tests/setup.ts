// api/tests/setup.ts
// Se ejecuta antes de cada archivo de prueba y antes de cualquier importación de src/.
//
// Garantiza que ninguna prueba pueda conectarse a la base Neon real:
// - DATABASE_URL apunta a un host del dominio reservado ".invalid", que nunca resuelve.
// - dotenv (usado en src/config/env.ts) NO sobrescribe variables ya definidas, por lo que los
//   valores de api/.env no reemplazan a estos aunque se carguen después.
//
// Estos valores son ficticios y no contienen credenciales.
process.env.DATABASE_URL = "postgresql://pruebas.invalid:5432/sin-base";
process.env.CURRENT_USER_ID = "1";
