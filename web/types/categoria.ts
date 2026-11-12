// types/categoria.ts
export const TIPOS_CATEGORIA = ["ingreso", "gasto", "ahorro"] as const;
export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

export interface Categoria {
    CATId: number;
    CATNombre: string;
    // Se mantiene como string: pueden existir valores históricos fuera de TipoCategoria.
    CATTipo: string;
    CATColor: string | null;
    CATIcono: string | null;
    CATActiva: boolean;
    CATCreadoEn: string;
    USUId: number;
}

export interface CategoriasResponse {
    success: boolean;
    message: string;
    data: Categoria[];
}

export interface CategoriaResponse {
    success: boolean;
    message: string;
    data: Categoria;
}

export interface CrearCategoriaPayload {
    CATNombre: string;
    CATTipo: TipoCategoria;
    CATColor?: string | null;
    CATIcono?: string | null;
}

export type EditarCategoriaPayload = Partial<CrearCategoriaPayload>;

export interface GrupoDuplicadoCategoria {
    tipo: string;
    nombreNormalizado: string;
    categorias: Pick<Categoria, "CATId" | "CATNombre" | "CATActiva">[];
}

export interface DuplicadosCategoriasResponse {
    success: boolean;
    message: string;
    data: GrupoDuplicadoCategoria[];
}
