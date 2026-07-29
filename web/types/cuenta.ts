// types/cuenta.ts
export interface Cuenta {
    CUEId: number;
    CUENombre: string;
    CUETipo: string;
    CUESaldoInicial: string;
    CUEActiva: boolean;
    CUECreadoEn: string;
    USUId: number;
}

export interface CuentasResponse {
    success: boolean;
    message: string;
    data: Cuenta[];
}
