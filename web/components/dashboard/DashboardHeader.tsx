// components/dashboard/DashboardHeader.tsx
export default function DashboardHeader() {
    return (
        <header className="flex flex-col gap-2">
            <p className="text-sm font-medium text-violet-400">
                Panel financiero personal
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
                Wolfy Lunar Budget
            </h1>

            <p className="max-w-2xl text-zinc-400">
                Control de ingresos, gastos, ahorros y metas financieras.
            </p>
        </header>
    );
}