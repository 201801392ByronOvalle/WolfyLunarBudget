// types/movimiento.ts
import { Cuenta } from "./cuenta";
import { Categoria } from "./categoria";

export const TIPOS_MOVIMIENTO = ["INGRESO", "GASTO", "AHORRO"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface Movimiento {
    MOVId: number;
    MOVTipo: TipoMovimiento;
    // Prisma serializa los campos Decimal como string en el JSON de respuesta.
    MOVMonto: string;
    MOVDescripcion: string | null;
    MOVFecha: string;
    MOVActiva: boolean;
    MOVCreadoEn: string;
    USUId: number;
    CUEId: number;
    CATId: number | null;
    cuenta: Cuenta;
    categoria: Categoria | null;
}

export interface MovimientosResponse {
    success: boolean;
    message: string;
    data: Movimiento[];
}

export interface MovimientoResponse {
    success: boolean;
    message: string;
    data: Movimiento;
}

export interface CrearMovimientoPayload {
    USUId: number;
    CUEId: number;
    CATId?: number | null;
    MOVTipo: TipoMovimiento;
    MOVMonto: number;
    MOVDescripcion?: string | null;
    MOVFecha: string;
}

export type EditarMovimientoPayload = Partial<CrearMovimientoPayload>;
