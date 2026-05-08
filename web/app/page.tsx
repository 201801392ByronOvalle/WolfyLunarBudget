// app/page.tsx
import AccountsOverview from "@/components/dashboard/AccountsOverview";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import GoalsOverview from "@/components/dashboard/GoalOverview";
import RecentMovements from "@/components/dashboard/RecentMovements";
import SummaryCard from "@/components/dashboard/SummaryCard";
import AppShell from "@/components/layout/AppShell";
import { getUsuarios } from "@/services/usuarios.service";

export default async function HomePage() {
  let usuarioNombre = "Modo local sin conexión";

  try {
    const usuariosResponse = await getUsuarios();
    usuarioNombre = usuariosResponse.data[0]?.USUNombre ?? "Sin usuario";
  } catch {
    usuarioNombre = "Modo local sin conexión";
  }

  return (
    <AppShell>
      {/* Header del Dashboard */}
      <DashboardHeader />

      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Usuario conectado: <span className="font-semibold">{usuarioNombre}</span>
      </p>

      {/* Cards de Resumen */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Ingresos" amount="Q0.00" helper="Total recibido este mes" tone="income" />
        <SummaryCard title="Gastos" amount="Q0.00" helper="Total gastado este mes" tone="expense" />
        <SummaryCard title="Ahorro" amount="Q0.00" helper="Dinero enviado a metas" tone="saving" />
        <SummaryCard title="Disponible" amount="Q0.00" helper="Dinero libre estimado" tone="available" />
      </section>

      {/* Dashboard principal */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-6">
          {/* Sección de Movimiento Recientes */}
          <RecentMovements />

          {/* Sección Cuentas Bancarias */}
          <AccountsOverview />
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-6">
          {/* Sección de Metas */}
          <GoalsOverview />
        </div>
      </section>
    </AppShell>
  );
}