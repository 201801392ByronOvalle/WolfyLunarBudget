// services/cuentas.service.ts
import { apiGet } from "./api";
import { Cuenta, CuentasResponse } from "@/types/cuenta";

export function getCuentas() {
    return apiGet<CuentasResponse>("/api/cuentas");
}

export async function getCuentasActivas(): Promise<Cuenta[]> {
    const respuesta = await getCuentas();
    return respuesta.data.filter((cuenta) => cuenta.CUEActiva);
}
