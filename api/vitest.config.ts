// api/vitest.config.ts
// Configuración mínima de Vitest para la API (Constitución v1.2.0, Principio VII).
// Las pruebas no usan la base de datos: tests/setup.ts fuerza un DATABASE_URL inexistente.
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
    },
});
