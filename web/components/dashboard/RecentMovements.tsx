// web/components/dashboard/RecentMovements.tsx
const movements = [
    {
        id: 1,
        description: "Salario mensual",
        category: "Salario",
        account: "BI Sueldo",
        type: "ingreso",
        amount: 12000,
    },
    {
        id: 2,
        description: "Ahorro viaje México",
        category: "Ahorro",
        account: "BAC Viaje",
        type: "ahorro",
        amount: 1500,
    },
    {
        id: 3,
        description: "Libro nuevo",
        category: "Libros",
        account: "Gastos y Hobbies",
        type: "gasto",
        amount: 250,
    },
];

export default function RecentMovements() {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Movimientos recientes</h2>
                <p className="text-sm text-zinc-400">
                    Últimos ingresos, gastos y ahorros registrados.
                </p>
            </div>

            <div className="space-y-3">
                {movements.map((movement) => {
                    const isExpense = movement.type === "gasto";

                    return (
                        <div
                            key={movement.id}
                            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                        >
                        <div>
                            <p className="font-medium">{movement.description}</p>
                            <p className="text-sm text-zinc-500">
                                {movement.category} · {movement.account}
                            </p>
                        </div>

                        <p
                            className={`font-bold ${
                            isExpense ? "text-red-400" : "text-emerald-400"
                            }`}
                        >
                            {isExpense ? "-" : "+"}Q{movement.amount.toFixed(2)}
                        </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}