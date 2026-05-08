// app/movimientos/page.tsx
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import CreateMovementForm from "@/components/movimientos/CreateMovementForm";

export default function MovimientosPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Movimientos"
                description="Registra, consulta y administra ingresos, gastos y ahorros."
            />

            <CreateMovementForm />
        </AppShell>
    );
}