// app/metas/page.tsx
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

export default function MetasPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Planificación"
                title="Metas"
                description="Da seguimiento a tus objetivos financieros personales."
            />
        </AppShell>
    );
}