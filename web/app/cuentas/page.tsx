// app/cuentas/page.tsx
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";

export default function CuentasPage() {
    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Cuentas"
                description="Administra tus cuentas monetarias, de ahorro e inversión."
            />
        </AppShell>
    );
}