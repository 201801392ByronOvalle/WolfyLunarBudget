// web/tests/categorias.service.test.ts
// US5 — Filtro de opciones de categoría en Movimientos (T052). Función pura: sin red ni DOM.
import { describe, expect, it } from "vitest";
import { filtrarCategoriasParaMovimiento } from "@/services/categorias.service";
import type { Categoria } from "@/types/categoria";

function categoria(CATId: number, CATTipo: string, CATActiva = true): Categoria {
    return {
        CATId,
        CATNombre: `Categoría ${CATId}`,
        CATTipo,
        CATColor: null,
        CATIcono: null,
        CATActiva,
        CATCreadoEn: "2026-01-10T15:00:00.000Z",
        USUId: 1,
    } as Categoria;
}

const CATEGORIAS = [
    categoria(1, "gasto"),
    categoria(2, "ingreso"),
    categoria(3, " Gasto "),
    categoria(4, "gasto", false),
    categoria(5, "ahorro"),
    categoria(6, "otro"),
];

describe("filtrarCategoriasParaMovimiento", () => {
    it("movimiento nuevo: solo activas cuyo tipo corresponde (US5-1)", () => {
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "GASTO");

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([1, 3]);
        expect(opciones.every((o) => o.marca === null)).toBe(true);
    });

    it("edición: incluye la categoría actual inactiva marcada (US5-4)", () => {
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "GASTO", 4);

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([1, 3, 4]);
        expect(opciones.find((o) => o.categoria.CATId === 4)?.marca).toBe("(inactiva)");
    });

    it("edición: incluye la actual que no corresponde al tipo, marcada (US5-12)", () => {
        // Movimiento histórico de tipo INGRESO guardado con la categoría 1 (gasto).
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "INGRESO", 1, "INGRESO");

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([2, 1]);
        expect(opciones.find((o) => o.categoria.CATId === 1)?.marca).toBe("(no corresponde al tipo)");
    });

    it("si el usuario cambió el tipo y la actual ya no corresponde, no la incluye", () => {
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "AHORRO", 1, "INGRESO");

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([5]);
    });

    it("si el usuario cambió el tipo, la actual inactiva deja de ofrecerse (la API respondería 409)", () => {
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "AHORRO", 4, "GASTO");

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([5]);
    });

    it("al volver al tipo correspondiente, la actual activa aparece sin marca", () => {
        const opciones = filtrarCategoriasParaMovimiento(CATEGORIAS, "GASTO", 1, "INGRESO");

        expect(opciones.map((o) => o.categoria.CATId)).toEqual([1, 3]);
        expect(opciones.every((o) => o.marca === null)).toBe(true);
    });

    it("sin categorías del tipo → lista vacía", () => {
        expect(filtrarCategoriasParaMovimiento([categoria(2, "ingreso")], "AHORRO")).toEqual([]);
    });
});
