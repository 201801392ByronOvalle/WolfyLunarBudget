// components/layout/AppSidebar.tsx
import { BarChart3, CreditCard, Goal, Home, ListChecks, Wallet } from "lucide-react";

const menuItems = [
    { label: "Dashboard", icon: Home },
    { label: "Movimientos", icon: ListChecks },
    { label: "Cuentas", icon: Wallet },
    { label: "Categorías", icon: CreditCard },
    { label: "Metas", icon: Goal },
    { label: "Reportes", icon: BarChart3 },
];

export default function AppSidebar() {
    return (
        <aside className="hidden min-h-screen w-72 border-r border-zinc-800 bg-zinc-950 p-5 text-white lg:block">
            <div className="mb-8">
                <p className="text-sm font-medium text-violet-400">Wolfy Lunar</p>
                <h1 className="text-2xl font-bold">Budget</h1>
            </div>

            <nav className="flex flex-col gap-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.label}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                        >
                            <Icon size={18} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}