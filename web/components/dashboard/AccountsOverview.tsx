// web/components/dashboard/AccountsOverview.tsx
const accounts = [
    {
        id: 1,
        name: "BI Sueldo",
        type: "Monetaria",
        balance: 3500,
    },
    {
        id: 2,
        name: "BAC Ahorro General",
        type: "Ahorro",
        balance: 28000,
    },
    {
        id: 3,
        name: "BAC Viaje",
        type: "Ahorro",
        balance: 4500,
    },
    {
        id: 4,
        name: "Gastos y Hobbies",
        type: "Monetaria",
        balance: 750,
    },
];

export default function AccountsOverview() {
    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Cuentas</h2>
                <p className="text-sm text-zinc-400">
                    Resumen de tus cuentas principales.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {accounts.map((account) => (
                    <article
                        key={account.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                    >
                        <p className="font-medium">{account.name}</p>

                        <p className="mt-1 text-sm text-zinc-500">{account.type}</p>

                        <p className="mt-4 text-2xl font-bold text-violet-400">
                        Q{account.balance.toFixed(2)}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}