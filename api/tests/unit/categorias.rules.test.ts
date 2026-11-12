// api/tests/unit/categorias.rules.test.ts
// Pruebas de las reglas puras de categorías (T009). No usan Prisma ni red.
import { describe, expect, it } from "vitest";
import {
    LONGITUD_MAXIMA,
    TIPOS_CATEGORIA,
    cambiosCategoria,
    cambiosMovimiento,
    detectarDuplicados,
    normalizarNombre,
    normalizarOpcional,
    tipoCorresponde,
    validarColor,
    validarIcono,
    validarNombre,
    validarTipo,
} from "../../src/modules/categorias/categorias.rules";

describe("constantes", () => {
    it("define los tres tipos en minúsculas y el límite de 50", () => {
        expect(TIPOS_CATEGORIA).toEqual(["ingreso", "gasto", "ahorro"]);
        expect(LONGITUD_MAXIMA).toBe(50);
    });
});

describe("normalizarNombre", () => {
    it("recorta y pasa a minúsculas", () => {
        expect(normalizarNombre(" Comida ")).toBe("comida");
        expect(normalizarNombre("COMIDA")).toBe(normalizarNombre("comida"));
    });

    it("conserva tildes y espacios internos", () => {
        expect(normalizarNombre("Café")).not.toBe(normalizarNombre("Cafe"));
        expect(normalizarNombre("Comida  rápida")).toBe("comida  rápida");
        expect(normalizarNombre("Comida rápida")).not.toBe(normalizarNombre("Comida  rápida"));
    });
});

describe("validarNombre: nombre recortado no vacío, con un máximo de 50 caracteres", () => {
    const mensaje = "CATNombre es requerido y debe tener como máximo 50 caracteres";

    it.each([undefined, null, "", "   ", 5, "a".repeat(51), ` ${"a".repeat(51)} `])(
        "rechaza %j",
        (valor) => {
            expect(validarNombre(valor)).toBe(mensaje);
        },
    );

    it.each(["Comida", " Comida ", "a".repeat(50), ` ${"a".repeat(50)} `])("acepta %j", (valor) => {
        expect(validarNombre(valor)).toBeNull();
    });
});

describe("validarTipo: exactamente igual a ingreso, gasto o ahorro", () => {
    it.each(["ingreso", "gasto", "ahorro"])("acepta %s", (valor) => {
        expect(validarTipo(valor)).toBeNull();
    });

    it.each(["Gasto", "GASTO", " gasto", "transferencia", "", undefined, null, 1])("rechaza %j", (valor) => {
        expect(validarTipo(valor)).toBe("CATTipo debe ser uno de: ingreso, gasto, ahorro");
    });
});

describe("validarColor: null o #RRGGBB", () => {
    it.each([undefined, null, "", "#f97316", "#FFFFFF", "#a1B2c3"])("acepta %j", (valor) => {
        expect(validarColor(valor)).toBeNull();
    });

    it.each(["f97316", "#fff", "#f9731g", "#f973166", "rojo", 123])("rechaza %j", (valor) => {
        expect(validarColor(valor)).toBe("CATColor debe tener el formato #RRGGBB");
    });
});

describe("validarIcono: null o texto recortado de 1 a 50 caracteres", () => {
    it.each([undefined, null, "", "   ", "wallet", "a".repeat(50)])("acepta %j", (valor) => {
        expect(validarIcono(valor)).toBeNull();
    });

    it.each(["a".repeat(51), 7, true])("rechaza %j", (valor) => {
        expect(validarIcono(valor)).toBe("CATIcono debe ser texto de hasta 50 caracteres");
    });
});

describe("normalizarOpcional", () => {
    it("recorta y convierte vacío en null", () => {
        expect(normalizarOpcional(undefined)).toBeNull();
        expect(normalizarOpcional(null)).toBeNull();
        expect(normalizarOpcional("")).toBeNull();
        expect(normalizarOpcional("   ")).toBeNull();
        expect(normalizarOpcional(" wallet ")).toBe("wallet");
    });
});

describe("tipoCorresponde", () => {
    it.each([
        ["ingreso", "INGRESO"],
        ["gasto", "GASTO"],
        ["ahorro", "AHORRO"],
        ["Gasto", "GASTO"],
        [" gasto ", "GASTO"],
    ])("%j corresponde a %s", (catTipo, movTipo) => {
        expect(tipoCorresponde(catTipo, movTipo)).toBe(true);
    });

    it.each([
        ["gasto", "INGRESO"],
        ["ingreso", "AHORRO"],
        ["transferencia", "GASTO"],
        ["", "GASTO"],
    ])("%j no corresponde a %s", (catTipo, movTipo) => {
        expect(tipoCorresponde(catTipo, movTipo)).toBe(false);
    });
});

describe("detectarDuplicados", () => {
    const categoria = (CATId: number, CATNombre: string, CATTipo: string, CATActiva = true) => ({
        CATId,
        CATNombre,
        CATTipo,
        CATActiva,
    });

    it("devuelve [] sin duplicados", () => {
        expect(detectarDuplicados([categoria(1, "Comida", "gasto"), categoria(2, "Sueldo", "ingreso")])).toEqual([]);
    });

    it("agrupa activas e inactivas con el mismo tipo y nombre normalizado", () => {
        expect(
            detectarDuplicados([
                categoria(3, "Comida", "gasto"),
                categoria(4, "Sueldo", "ingreso"),
                categoria(9, "comida ", "gasto", false),
            ]),
        ).toEqual([
            {
                tipo: "gasto",
                nombreNormalizado: "comida",
                categorias: [
                    { CATId: 3, CATNombre: "Comida", CATActiva: true },
                    { CATId: 9, CATNombre: "comida ", CATActiva: false },
                ],
            },
        ]);
    });

    it("no agrupa el mismo nombre con distinto tipo", () => {
        expect(detectarDuplicados([categoria(1, "Ahorro", "ahorro"), categoria(2, "Ahorro", "ingreso")])).toEqual([]);
    });

    it("normaliza el tipo histórico (espacios y mayúsculas)", () => {
        const grupos = detectarDuplicados([categoria(1, "Comida", "gasto"), categoria(2, "Comida", " Gasto ")]);
        expect(grupos).toHaveLength(1);
        expect(grupos[0].tipo).toBe("gasto");
    });
});

describe("cambiosCategoria", () => {
    const existente = { CATNombre: "Comida", CATTipo: "gasto", CATColor: "#ef4444", CATIcono: null };

    it("una propiedad ausente no es un cambio", () => {
        expect(cambiosCategoria(existente, {})).toEqual({ nombre: false, tipo: false, color: false, icono: false });
    });

    it("el mismo valor normalizado no es un cambio", () => {
        expect(
            cambiosCategoria(existente, { CATNombre: " Comida ", CATTipo: "gasto", CATColor: "#ef4444", CATIcono: "" }),
        ).toEqual({ nombre: false, tipo: false, color: false, icono: false });
    });

    it("cambiar solo mayúsculas del nombre sí es un cambio", () => {
        expect(cambiosCategoria(existente, { CATNombre: "comida" }).nombre).toBe(true);
    });

    it("compara contra el valor persistido aunque tenga espacios históricos", () => {
        const historico = { ...existente, CATNombre: " Comida" };
        expect(cambiosCategoria(historico, { CATNombre: " Comida " }).nombre).toBe(true);
    });

    it("D-1: un valor histórico reenviado exactamente igual no es un cambio", () => {
        const historico = { CATNombre: "comida ", CATTipo: " Gasto", CATColor: " #ABC", CATIcono: " tag " };
        expect(
            cambiosCategoria(historico, { CATNombre: "comida ", CATTipo: " Gasto", CATColor: " #ABC", CATIcono: " tag " }),
        ).toEqual({ nombre: false, tipo: false, color: false, icono: false });
    });

    it("D-1: el nombre histórico recortado sí es un cambio (se valida y se aplica la unicidad)", () => {
        expect(cambiosCategoria({ ...existente, CATNombre: "comida " }, { CATNombre: "comida" }).nombre).toBe(true);
    });

    it("detecta cambios de tipo, color e ícono", () => {
        expect(cambiosCategoria(existente, { CATTipo: "ahorro", CATColor: "", CATIcono: "wallet" })).toEqual({
            nombre: false,
            tipo: true,
            color: true,
            icono: true,
        });
    });

    it("un valor de tipo no textual cuenta como cambio para que se valide", () => {
        expect(cambiosCategoria(existente, { CATNombre: 5, CATColor: 7 })).toMatchObject({ nombre: true, color: true });
    });
});

describe("cambiosMovimiento", () => {
    const existente = { MOVTipo: "GASTO", CATId: 7, CUEId: 2 };

    it("una propiedad ausente no es un cambio", () => {
        expect(cambiosMovimiento(existente, {})).toEqual({ tipo: false, categoria: false, cuenta: false });
    });

    it("el mismo valor no es un cambio", () => {
        expect(cambiosMovimiento(existente, { MOVTipo: "GASTO", CATId: 7, CUEId: 2 })).toEqual({
            tipo: false,
            categoria: false,
            cuenta: false,
        });
    });

    it("CATId null frente a null persistido no es un cambio", () => {
        expect(cambiosMovimiento({ ...existente, CATId: null }, { CATId: null }).categoria).toBe(false);
    });

    it("detecta cambios de tipo, categoría y cuenta", () => {
        expect(cambiosMovimiento(existente, { MOVTipo: "INGRESO", CATId: 8, CUEId: 3 })).toEqual({
            tipo: true,
            categoria: true,
            cuenta: true,
        });
    });

    it("quitar la categoría (null) es un cambio", () => {
        expect(cambiosMovimiento(existente, { CATId: null }).categoria).toBe(true);
    });
});
