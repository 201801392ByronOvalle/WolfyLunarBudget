// api/tests/support/servidor-prueba.ts
// Levanta la app en un puerto efímero para pruebas HTTP con el fetch nativo de Node.
//
// Requisito: el archivo de prueba que use este helper DEBE declarar antes el mock de Prisma:
//   vi.mock("../../src/lib/prisma", async () => {
//       const { prismaFake } = await import("../support/prisma-fake");
//       return { prisma: prismaFake, OPCIONES_TRANSACCION: { maxWait: 5000, timeout: 10000 } };
//   });
// y cargar en prismaFake.control.datos el usuario de CURRENT_USER_ID (tests/setup.ts usa "1").
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { app } from "../../src/app";
import { inicializarUsuarioActual } from "../../src/lib/usuario-actual";

export interface ServidorDePrueba {
    baseUrl: string;
    cerrar: () => Promise<void>;
}

export async function iniciarServidorDePrueba(): Promise<ServidorDePrueba> {
    // Recorre el mismo código de verificación que el arranque real, contra el doble.
    await inicializarUsuarioActual();

    const servidor = await new Promise<Server>((resolve) => {
        const instancia = app.listen(0, () => resolve(instancia));
    });
    const { port } = servidor.address() as AddressInfo;

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        cerrar: () =>
            new Promise<void>((resolve, reject) => {
                servidor.close((error) => (error ? reject(error) : resolve()));
            }),
    };
}
