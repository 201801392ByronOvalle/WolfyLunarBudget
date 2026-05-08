// app/reportes/page.tsx
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

export default function ReportesPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Análisis"
                title="Reportes"
                description="Visualiza tus gastos, ingresos y ahorro mensual."
            />
        </AppShell>
    );
}