import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SummaryCard from "@/components/dashboard/SummaryCard";
import { getUsuarios } from "@/services/usuarios.services";

export default async function HomePage() {
  let usuarioNombre = "Modo local sin conexión";

  try {
    const usuariosResponse = await getUsuarios();
    usuarioNombre = usuariosResponse.data[0]?.USUNombre ?? "Sin usuario";
  } catch {
    usuarioNombre = "Modo local sin conexión";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <DashboardHeader />

        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Usuario conectado:{" "}
          <span className="font-semibold">{usuarioNombre}</span>
        </p>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Ingresos" amount="Q0.00" helper="Total recibido este mes" tone="income" />
          <SummaryCard title="Gastos" amount="Q0.00" helper="Total gastado este mes" tone="expense" />
          <SummaryCard title="Ahorro" amount="Q0.00" helper="Dinero enviado a metas" tone="saving" />
          <SummaryCard title="Disponible" amount="Q0.00" helper="Dinero libre estimado" tone="available" />
        </section>
      </div>
    </main>
  );
}