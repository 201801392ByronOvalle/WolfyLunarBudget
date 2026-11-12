// services/categorias.service.ts
import { apiGet, apiPost } from "./api";
import {
    Categoria,
    CategoriaResponse,
    CategoriasResponse,
    CrearCategoriaPayload,
    DuplicadosCategoriasResponse,
} from "@/types/categoria";

export function getCategorias() {
    return apiGet<CategoriasResponse>("/api/categorias");
}

export async function getCategoriasActivas(): Promise<Categoria[]> {
    const respuesta = await getCategorias();
    return respuesta.data.filter((categoria) => categoria.CATActiva);
}

// Diagnóstico de solo lectura de duplicados históricos (FR-025). No lo usa Movimientos.
export function getDiagnosticoDuplicados() {
    return apiGet<DuplicadosCategoriasResponse>("/api/categorias/duplicados");
}

// Crea una categoría del usuario actual (lo determina el servidor). Ante un rechazo, lanza un
// Error con el mensaje de la API (validación, duplicado o concurrencia).
export function crearCategoria(payload: CrearCategoriaPayload) {
    return apiPost<CategoriaResponse>("/api/categorias", payload);
}
