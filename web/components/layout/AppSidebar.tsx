// components/layout/AppSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    CreditCard,
    Goal,
    Home,
    ListChecks,
    Wallet,
} from "lucide-react";

const menuItems = [
    { label: "Dashboard", href: "/", icon: Home },
    { label: "Movimientos", href: "/movimientos", icon: ListChecks },
    { label: "Cuentas", href: "/cuentas", icon: Wallet },
    { label: "Categorías", href: "/categorias", icon: CreditCard },
    { label: "Metas", href: "/metas", icon: Goal },
    { label: "Reportes", href: "/reportes", icon: BarChart3 },
];

export default function AppSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden min-h-screen w-72 border-r border-zinc-800 bg-zinc-950 p-5 text-white lg:block">
            <div className="mb-8">
                <p className="text-sm font-medium text-violet-400">Wolfy Lunar</p>
                <h1 className="text-2xl font-bold">Budget</h1>
            </div>

            <nav className="flex flex-col gap-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                                isActive
                                ? "bg-violet-600 text-white"
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                            }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}