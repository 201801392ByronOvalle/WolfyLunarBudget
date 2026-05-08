// services/usuarios.service.ts
import { apiGet } from "./api";
import { UsuariosResponse } from "@/types/usuario";

export function getUsuarios() {
    return apiGet<UsuariosResponse>("/api/usuarios");
}