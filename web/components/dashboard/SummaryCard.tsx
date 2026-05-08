// components/dashboard/SummaryCard.tsx
interface SummaryCardProps {
    title: string;
    amount: string;
    helper?: string;
    tone: "income" | "expense" | "saving" | "available";
}

const toneClasses = {
    income: "text-emerald-400",
    expense: "text-red-400",
    saving: "text-sky-400",
    available: "text-violet-400",
};

export default function SummaryCard({
    title,
    amount,
    helper,
    tone,
}: SummaryCardProps) {
    return (
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
            <p className="text-sm text-zinc-400">{title}</p>

            <h2 className={`mt-2 text-3xl font-bold ${toneClasses[tone]}`}>
                {amount}
            </h2>

            {helper && <p className="mt-2 text-xs text-zinc-500">{helper}</p>}
        </article>
    );
}