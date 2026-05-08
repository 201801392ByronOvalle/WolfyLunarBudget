// app/page.tsx
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SummaryCard from "@/components/dashboard/SummaryCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
        <DashboardHeader />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Ingresos"
            amount="Q0.00"
            helper="Total recibido este mes"
            tone="income"
          />

          <SummaryCard
            title="Gastos"
            amount="Q0.00"
            helper="Total gastado este mes"
            tone="expense"
          />

          <SummaryCard
            title="Ahorro"
            amount="Q0.00"
            helper="Dinero enviado a metas"
            tone="saving"
          />

          <SummaryCard
            title="Disponible"
            amount="Q0.00"
            helper="Dinero libre estimado"
            tone="available"
          />
        </section>
      </div>
    </main>
  );
}