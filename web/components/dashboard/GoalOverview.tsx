// web/components/dashboard/GoalsOverview.tsx
const goals = [
    {
        id: 1,
        name: "Viaje a México",
        current: 4500,
        target: 18000,
    },
    {
        id: 2,
        name: "Carro",
        current: 28000,
        target: 82000,
    },
    {
        id: 3,
        name: "Inversión plazo fijo",
        current: 28000,
        target: 28000,
    },
];

export default function GoalsOverview() {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Metas financieras</h2>
                <p className="text-sm text-zinc-400">
                    Seguimiento rápido de tus objetivos principales.
                </p>
            </div>

            <div className="space-y-4">
                {goals.map((goal) => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100);

                    return (
                        <article
                            key={goal.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                        >
                            <div className="mb-3 flex items-center justify-between gap-4">
                                <div>
                                <p className="font-medium">{goal.name}</p>
                                <p className="text-sm text-zinc-500">
                                    Q{goal.current.toFixed(2)} de Q{goal.target.toFixed(2)}
                                </p>
                                </div>

                                <p className="text-sm font-semibold text-violet-400">
                                {progress.toFixed(0)}%
                                </p>
                            </div>

                            <div className="h-2 rounded-full bg-zinc-800">
                                <div
                                className="h-2 rounded-full bg-violet-500"
                                style={{ width: `${progress}%` }}
                                />
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}