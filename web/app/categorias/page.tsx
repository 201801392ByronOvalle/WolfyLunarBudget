"use client";

// app/categorias/page.tsx
import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import CategoryForm from "@/components/categorias/CategoryForm";
import CategoriesTable from "@/components/categorias/CategoriesTable";

export default function CategoriasPage() {
    // Señal de refresco: la lista se recarga tras crear una categoría (y, más adelante, al editar o
    // cambiar el estado).
    const [refreshSignal, setRefreshSignal] = useState(0);

    function refrescarCategorias() {
        setRefreshSignal((valor) => valor + 1);
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Categorías"
                description="Organiza tus ingresos, gastos y ahorros."
            />

            <CategoryForm onCategoriaCreada={refrescarCategorias} />

            <CategoriesTable refreshSignal={refreshSignal} />
        </AppShell>
    );
}
