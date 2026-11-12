"use client";

// app/categorias/page.tsx
import { useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import CategoryForm from "@/components/categorias/CategoryForm";
import CategoriesTable from "@/components/categorias/CategoriesTable";
import { Categoria } from "@/types/categoria";

export default function CategoriasPage() {
    // Orquestación de la pantalla: señal de refresco de la lista, categoría en edición y el mensaje
    // con el que vuelve a montarse el formulario de creación tras guardar.
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [categoriaEnEdicion, setCategoriaEnEdicion] = useState<Categoria | null>(null);
    const [mensajeFormulario, setMensajeFormulario] = useState<string | null>(null);
    const formularioRef = useRef<HTMLDivElement>(null);

    function refrescarCategorias() {
        setRefreshSignal((valor) => valor + 1);
    }

    function iniciarEdicion(categoria: Categoria) {
        setMensajeFormulario(null);
        setCategoriaEnEdicion(categoria);
        formularioRef.current?.scrollIntoView({ block: "start" });
    }

    function terminarEdicion(categoria: Categoria) {
        setCategoriaEnEdicion(null);
        setMensajeFormulario(`Cambios guardados en “${categoria.CATNombre.trim()}”.`);
        refrescarCategorias();
    }

    function cancelarEdicion() {
        setCategoriaEnEdicion(null);
        setMensajeFormulario(null);
    }

    return (
        <AppShell>
            <PageHeader
                eyebrow="Gestión financiera"
                title="Categorías"
                description="Organiza tus ingresos, gastos y ahorros."
            />

            <div ref={formularioRef} className="scroll-mt-6">
                <CategoryForm
                    // Una key por modo y categoría reinicia el estado del formulario sin efectos.
                    key={categoriaEnEdicion ? `editar-${categoriaEnEdicion.CATId}` : "nueva"}
                    categoria={categoriaEnEdicion}
                    mensajeInicial={mensajeFormulario}
                    onCategoriaCreada={refrescarCategorias}
                    onCategoriaEditada={terminarEdicion}
                    onCancelarEdicion={cancelarEdicion}
                />
            </div>

            <CategoriesTable
                refreshSignal={refreshSignal}
                categoriaEnEdicionId={categoriaEnEdicion?.CATId ?? null}
                onEditar={iniciarEdicion}
            />
        </AppShell>
    );
}
