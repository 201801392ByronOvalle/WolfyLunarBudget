// web/vitest.config.ts
// Configuración mínima de Vitest para la web (Constitución v1.2.0, Principio VII).
// Solo pruebas de funciones puras de services/: entorno node, sin jsdom ni plugins.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
