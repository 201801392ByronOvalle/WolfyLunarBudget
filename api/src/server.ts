// api/src/server.ts
// Verifica el usuario actual configurado y levanta el servidor (D3, D4).
// Si la configuración es inválida o la base no responde, la API no arranca.
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { describirErrorArranque, inicializarUsuarioActual } from "./lib/usuario-actual";

async function iniciar(): Promise<void> {
    try {
        await inicializarUsuarioActual();
    } catch (error) {
        const { mensaje, codigoSalida } = describirErrorArranque(error);
        console.error(mensaje);
        await prisma.$disconnect().catch(() => undefined);
        process.exit(codigoSalida);
    }

    // Información en consola al iniciar el servidor
    app.listen(env.port, () => {
        console.log(`API running on http://localhost:${env.port}`);
    });
}

void iniciar();
