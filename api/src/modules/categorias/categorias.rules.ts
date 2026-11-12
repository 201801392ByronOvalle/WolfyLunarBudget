// api/src/modules/categorias/categorias.rules.ts
// Reglas puras del dominio de categorías, compartidas por los controladores de categorías y de
// movimientos. Sin Prisma, sin Express y sin mensajes HTTP más allá de los textos de validación.

export const TIPOS_CATEGORIA = ["ingreso", "gasto", "ahorro"] as const;
export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

export const LONGITUD_MAXIMA = 50;

const PATRON_COLOR = /^#[0-9a-fA-F]{6}$/;

export const MENSAJES_VALIDACION = {
    nombre: `CATNombre es requerido y debe tener como máximo ${LONGITUD_MAXIMA} caracteres`,
    tipo: `CATTipo debe ser uno de: ${TIPOS_CATEGORIA.join(", ")}`,
    color: "CATColor debe tener el formato #RRGGBB",
    icono: `CATIcono debe ser texto de hasta ${LONGITUD_MAXIMA} caracteres`,
} as const;

/** Nombre normalizado para comparar: recortado y en minúsculas (tildes y espacios internos se conservan). */
export function normalizarNombre(nombre: string): string {
    return nombre.trim().toLowerCase();
}

/** Recorta un texto opcional; vacío o solo espacios se convierte en null. */
export function normalizarOpcional(valor: string | null | undefined): string | null {
    if (valor === undefined || valor === null) return null;
    const recortado = valor.trim();
    return recortado === "" ? null : recortado;
}

/** Nombre recortado no vacío, con un máximo de 50 caracteres. */
export function validarNombre(valor: unknown): string | null {
    if (typeof valor !== "string") return MENSAJES_VALIDACION.nombre;
    const recortado = valor.trim();
    if (recortado === "" || recortado.length > LONGITUD_MAXIMA) return MENSAJES_VALIDACION.nombre;
    return null;
}

/** Tipo exactamente igual a `ingreso`, `gasto` o `ahorro`. */
export function validarTipo(valor: unknown): string | null {
    return typeof valor === "string" && (TIPOS_CATEGORIA as readonly string[]).includes(valor)
        ? null
        : MENSAJES_VALIDACION.tipo;
}

/** Color opcional: null, vacío o `#RRGGBB`. */
export function validarColor(valor: unknown): string | null {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== "string") return MENSAJES_VALIDACION.color;
    const normalizado = normalizarOpcional(valor);
    if (normalizado === null) return null;
    return PATRON_COLOR.test(normalizado) ? null : MENSAJES_VALIDACION.color;
}

/** Ícono opcional: null, vacío o texto recortado de 1 a 50 caracteres. */
export function validarIcono(valor: unknown): string | null {
    if (valor === undefined || valor === null) return null;
    if (typeof valor !== "string") return MENSAJES_VALIDACION.icono;
    const normalizado = normalizarOpcional(valor);
    if (normalizado === null) return null;
    return normalizado.length <= LONGITUD_MAXIMA ? null : MENSAJES_VALIDACION.icono;
}

/** Correspondencia sin distinguir mayúsculas: ingreso↔INGRESO, gasto↔GASTO, ahorro↔AHORRO. */
export function tipoCorresponde(catTipo: string, movTipo: string): boolean {
    const tipo = catTipo.trim().toLowerCase();
    if (!(TIPOS_CATEGORIA as readonly string[]).includes(tipo)) return false;
    return tipo.toUpperCase() === movTipo;
}

export interface CategoriaParaDuplicados {
    CATId: number;
    CATNombre: string;
    CATTipo: string;
    CATActiva: boolean;
}

export interface GrupoDuplicado {
    tipo: string;
    nombreNormalizado: string;
    categorias: { CATId: number; CATNombre: string; CATActiva: boolean }[];
}

/** Agrupa por tipo (recortado, minúsculas) y nombre normalizado; devuelve solo grupos con más de un elemento. */
export function detectarDuplicados(categorias: CategoriaParaDuplicados[]): GrupoDuplicado[] {
    const grupos = new Map<string, GrupoDuplicado>();
    for (const categoria of categorias) {
        const tipo = categoria.CATTipo.trim().toLowerCase();
        const nombreNormalizado = normalizarNombre(categoria.CATNombre);
        const clave = JSON.stringify([tipo, nombreNormalizado]);
        const grupo = grupos.get(clave) ?? { tipo, nombreNormalizado, categorias: [] };
        grupo.categorias.push({
            CATId: categoria.CATId,
            CATNombre: categoria.CATNombre,
            CATActiva: categoria.CATActiva,
        });
        grupos.set(clave, grupo);
    }
    return [...grupos.values()].filter((grupo) => grupo.categorias.length > 1);
}

export interface CategoriaPersistida {
    CATNombre: string;
    CATTipo: string;
    CATColor: string | null;
    CATIcono: string | null;
}

export interface CambiosCategoria {
    nombre: boolean;
    tipo: boolean;
    color: boolean;
    icono: boolean;
}

// Un valor no textual se considera un cambio para que la validación lo rechace.
function cambiaTextoOpcional(recibido: unknown, persistido: string | null): boolean {
    if (recibido === undefined) return false;
    if (recibido === null) return persistido !== null;
    if (typeof recibido !== "string") return true;
    return normalizarOpcional(recibido) !== persistido;
}

/**
 * Qué campos cambian realmente respecto de lo persistido (FR-026). Una propiedad ausente nunca es
 * un cambio; el valor recibido se normaliza como se guardaría antes de compararlo.
 */
export function cambiosCategoria(existente: CategoriaPersistida, body: Record<string, unknown>): CambiosCategoria {
    const { CATNombre, CATTipo, CATColor, CATIcono } = body;
    return {
        nombre:
            CATNombre !== undefined &&
            (typeof CATNombre !== "string" || CATNombre.trim() !== existente.CATNombre),
        tipo: CATTipo !== undefined && CATTipo !== existente.CATTipo,
        color: cambiaTextoOpcional(CATColor, existente.CATColor),
        icono: cambiaTextoOpcional(CATIcono, existente.CATIcono),
    };
}

export interface MovimientoPersistido {
    MOVTipo: string;
    CATId: number | null;
    CUEId: number;
}

export interface CambiosMovimiento {
    tipo: boolean;
    categoria: boolean;
    cuenta: boolean;
}

/** Qué referencias del movimiento cambian respecto de lo persistido (FR-026, Principio V). */
export function cambiosMovimiento(existente: MovimientoPersistido, body: Record<string, unknown>): CambiosMovimiento {
    const { MOVTipo, CATId, CUEId } = body;
    return {
        tipo: MOVTipo !== undefined && MOVTipo !== existente.MOVTipo,
        categoria: CATId !== undefined && (CATId ?? null) !== existente.CATId,
        cuenta: CUEId !== undefined && CUEId !== existente.CUEId,
    };
}
