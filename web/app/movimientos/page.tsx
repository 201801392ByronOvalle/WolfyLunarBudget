"use client";

// app/movimientos/page.tsx
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import CreateMovementForm from "@/components/movimientos/CreateMovementForm";
import MovementsTable from "@/components/movimientos/MovementsTable";

export default function MovimientosPage() {
    const [refreshSignal, setRefreshSignal] = useState(0);

    function refrescarMovimientos() {
        setRefreshSignal((valor) => valor + 1);
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Movimientos"
                description="Registra, consulta y administra ingresos, gastos y ahorros."
            />

            <CreateMovementForm onMovimientoCreado={refrescarMovimientos} />

            <MovementsTable refreshSignal={refreshSignal} />
        </AppShell>
    );
}
