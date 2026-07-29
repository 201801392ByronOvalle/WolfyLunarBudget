// services/categorias.service.ts
import { apiGet } from "./api";
import { Categoria, CategoriasResponse } from "@/types/categoria";

export function getCategorias() {
    return apiGet<CategoriasResponse>("/api/categorias");
}

export async function getCategoriasActivas(): Promise<Categoria[]> {
    const respuesta = await getCategorias();
    return respuesta.data.filter((categoria) => categoria.CATActiva);
}
