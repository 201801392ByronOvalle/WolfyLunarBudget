// services/movimientos.service.ts
import { apiGet, apiPatch, apiPost } from "./api";
import {
    CrearMovimientoPayload,
    EditarMovimientoPayload,
    MovimientoResponse,
    MovimientosResponse,
} from "@/types/movimiento";

export function getMovimientos() {
    return apiGet<MovimientosResponse>("/api/movimientos");
}

export function crearMovimiento(payload: CrearMovimientoPayload) {
    return apiPost<MovimientoResponse>("/api/movimientos", payload);
}

export function editarMovimiento(id: number, payload: EditarMovimientoPayload) {
    return apiPatch<MovimientoResponse>(`/api/movimientos/${id}`, payload);
}

export function desactivarMovimiento(id: number) {
    return apiPatch<MovimientoResponse>(`/api/movimientos/${id}/desactivar`);
}
