// services/categorias.service.ts
import { apiGet, apiPatch, apiPost } from "./api";
import {
    Categoria,
    CategoriaResponse,
    CategoriasResponse,
    CrearCategoriaPayload,
    DuplicadosCategoriasResponse,
    EditarCategoriaPayload,
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

// Edita una categoría propia. La API valida y escribe solo los campos que cambian (FR-026); ante un
// rechazo (404, 400, 409 por duplicado o por tipo con movimientos) lanza un Error con su mensaje.
export function editarCategoria(id: number, payload: EditarCategoriaPayload) {
    return apiPatch<CategoriaResponse>(`/api/categorias/${id}`, payload);
}

// Desactiva una categoría propia sin borrarla; sus movimientos se conservan (FR-008, FR-010).
// Si ya estaba inactiva, la API responde 409 y se lanza un Error con su mensaje.
export function desactivarCategoria(id: number) {
    return apiPatch<CategoriaResponse>(`/api/categorias/${id}/desactivar`);
}

// Reactiva una categoría propia. Si ya estaba activa, la API responde 409.
export function activarCategoria(id: number) {
    return apiPatch<CategoriaResponse>(`/api/categorias/${id}/activar`);
}
