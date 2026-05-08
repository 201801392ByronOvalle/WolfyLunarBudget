// api/prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const usuario = await prisma.usuario.upsert({
        where: {
        USUCorreo: "admin@wolfylunar.com",
        },
        update: {},
        create: {
        USUNombre: "Andres",
        USUCorreo: "admin@wolfylunar.com",
        USUPassword: "admin123",
        },
    });

    await prisma.cuenta.createMany({
        data: [
        {
            CUENombre: "BI Sueldo",
            CUETipo: "monetaria",
            CUESaldoInicial: 0,
            USUId: usuario.USUId,
        },
        {
            CUENombre: "BAC Ahorro General",
            CUETipo: "ahorro",
            CUESaldoInicial: 0,
            USUId: usuario.USUId,
        },
        {
            CUENombre: "BAC Viaje",
            CUETipo: "ahorro",
            CUESaldoInicial: 0,
            USUId: usuario.USUId,
        },
        {
            CUENombre: "Gastos y Hobbies",
            CUETipo: "monetaria",
            CUESaldoInicial: 0,
            USUId: usuario.USUId,
        },
        ],
        skipDuplicates: true,
    });

    await prisma.categoria.createMany({
        data: [
        { CATNombre: "Salario", CATTipo: "ingreso", CATColor: "#22c55e", CATIcono: "wallet", USUId: usuario.USUId },
        { CATNombre: "Ahorro", CATTipo: "ahorro", CATColor: "#38bdf8", CATIcono: "piggy-bank", USUId: usuario.USUId },
        { CATNombre: "Comida", CATTipo: "gasto", CATColor: "#f97316", CATIcono: "utensils", USUId: usuario.USUId },
        { CATNombre: "Transporte", CATTipo: "gasto", CATColor: "#eab308", CATIcono: "car", USUId: usuario.USUId },
        { CATNombre: "Servicios", CATTipo: "gasto", CATColor: "#8b5cf6", CATIcono: "receipt", USUId: usuario.USUId },
        { CATNombre: "Libros", CATTipo: "gasto", CATColor: "#06b6d4", CATIcono: "book-open", USUId: usuario.USUId },
        { CATNombre: "Juegos", CATTipo: "gasto", CATColor: "#ec4899", CATIcono: "gamepad-2", USUId: usuario.USUId },
        { CATNombre: "Salidas", CATTipo: "gasto", CATColor: "#f43f5e", CATIcono: "heart", USUId: usuario.USUId },
        { CATNombre: "Emergencias", CATTipo: "gasto", CATColor: "#ef4444", CATIcono: "shield-alert", USUId: usuario.USUId },
        ],
        skipDuplicates: true,
    });

    await prisma.meta.createMany({
        data: [
        {
            METNombre: "Viaje a México",
            METDescripcion: "Presupuesto para viaje corto de 3 días.",
            METMontoObjetivo: 18000,
            METMontoActual: 0,
            USUId: usuario.USUId,
        },
        {
            METNombre: "Carro",
            METDescripcion: "Meta para compra de carro.",
            METMontoObjetivo: 82000,
            METMontoActual: 0,
            USUId: usuario.USUId,
        },
        {
            METNombre: "Inversión plazo fijo",
            METDescripcion: "Dinero destinado a inversión.",
            METMontoObjetivo: 28000,
            METMontoActual: 0,
            USUId: usuario.USUId,
        },
        ],
        skipDuplicates: true,
    });

    console.log("Seed ejecutado correctamente");
}

main()
    .catch((error) => {
            console.error("Error ejecutando seed:", error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
    });