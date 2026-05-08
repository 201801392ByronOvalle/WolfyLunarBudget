// components/layout/AppShell.tsx
import AppSidebar from "./AppSidebar";

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            <div className="flex min-h-screen">
                <AppSidebar />

                <section className="flex-1">
                    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
                        {children}
                    </div>
                </section>
            </div>
        </main>
    );
}
