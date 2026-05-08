// app7categorias/page.tsx
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

export default function CategoriasPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Categorías"
                description="Organiza tus ingresos, gastos, ahorros y transferencias."
            />
        </AppShell>
    );
}