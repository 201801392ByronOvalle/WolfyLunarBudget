// types/usuario.ts
export interface Usuario {
    USUId: number;
    USUNombre: string;
    USUCorreo: string;
    USUCreadoEn: string;
}

export interface UsuariosResponse {
    success: boolean;
    data: Usuario[];
}