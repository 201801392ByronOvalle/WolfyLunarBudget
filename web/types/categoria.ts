// types/categoria.ts
export interface Categoria {
    CATId: number;
    CATNombre: string;
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
