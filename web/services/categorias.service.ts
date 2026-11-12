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
import type { TipoMovimiento } from "@/types/movimiento";

export function getCategorias() {
    return apiGet<CategoriasResponse>("/api/categorias");
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

export type MarcaCategoriaMovimiento = "(inactiva)" | "(no corresponde al tipo)" | null;

export interface OpcionCategoriaMovimiento {
    categoria: Categoria;
    /** Marca que se muestra junto al nombre cuando la opción es la categoría histórica del movimiento. */
    marca: MarcaCategoriaMovimiento;
}

// Misma correspondencia que la API: ingreso↔INGRESO, gasto↔GASTO, ahorro↔AHORRO, sin distinguir mayúsculas.
function tipoCorresponde(catTipo: string, tipoMovimiento: TipoMovimiento): boolean {
    return catTipo.trim().toUpperCase() === tipoMovimiento;
}

/**
 * Opciones del selector de categoría de Movimientos (FR-023). Ofrece solo las categorías activas cuyo
 * tipo corresponde al tipo elegido. En edición (`categoriaActualId`), si el tipo elegido sigue siendo
 * el guardado (`tipoPersistido`), agrega al final la categoría actual aunque esté inactiva o no
 * corresponda, marcada, para poder conservarla (FR-022, FR-026). Si el tipo cambió, la categoría
 * resultante debe cumplir las reglas actuales, igual que en la API.
 */
export function filtrarCategoriasParaMovimiento(
    categorias: Categoria[],
    tipoMovimiento: TipoMovimiento,
    categoriaActualId?: number | null,
    tipoPersistido: TipoMovimiento = tipoMovimiento,
): OpcionCategoriaMovimiento[] {
    const opciones: OpcionCategoriaMovimiento[] = categorias
        .filter((categoria) => categoria.CATActiva && tipoCorresponde(categoria.CATTipo, tipoMovimiento))
        .map((categoria) => ({ categoria, marca: null }));

    if (categoriaActualId == null || tipoMovimiento !== tipoPersistido) return opciones;
    if (opciones.some((opcion) => opcion.categoria.CATId === categoriaActualId)) return opciones;

    const actual = categorias.find((categoria) => categoria.CATId === categoriaActualId);
    if (!actual) return opciones;

    const marca = !actual.CATActiva ? "(inactiva)" : "(no corresponde al tipo)";
    return [...opciones, { categoria: actual, marca }];
}
