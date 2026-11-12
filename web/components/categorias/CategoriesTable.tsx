"use client";

// components/categorias/CategoriesTable.tsx
import { useCallback, useEffect, useState } from "react";
import { getCategorias, getDiagnosticoDuplicados } from "@/services/categorias.service";
import { Categoria, GrupoDuplicadoCategoria } from "@/types/categoria";

interface CategoriesTableProps {
    refreshSignal?: number;
}

const ETIQUETAS_TIPO: Record<string, string> = {
    ingreso: "Ingreso",
    gasto: "Gasto",
    ahorro: "Ahorro",
};

const COLORES_TIPO: Record<string, string> = {
    ingreso: "text-emerald-400",
    gasto: "text-red-400",
    ahorro: "text-sky-400",
};

// Un CATTipo histórico fuera de los tres valores se muestra tal cual.
function etiquetaTipo(tipo: string): string {
    return ETIQUETAS_TIPO[tipo] ?? tipo;
}

function colorTipo(tipo: string): string {
    return COLORES_TIPO[tipo] ?? "text-zinc-400";
}

export default function CategoriesTable({ refreshSignal = 0 }: CategoriesTableProps) {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [duplicados, setDuplicados] = useState<GrupoDuplicadoCategoria[]>([]);
    const [errorDiagnostico, setErrorDiagnostico] = useState(false);

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError(null);
        setErrorDiagnostico(false);

        // El diagnóstico no bloquea la lista: si falla, la lista se muestra igual con un aviso.
        const [resultadoCategorias, resultadoDiagnostico] = await Promise.allSettled([
            getCategorias(),
            getDiagnosticoDuplicados(),
        ]);

        if (resultadoCategorias.status === "fulfilled") {
            setCategorias(resultadoCategorias.value.data);
        } else {
            setCategorias([]);
            setError("No se pudieron cargar tus categorías. Revisa tu conexión e inténtalo de nuevo.");
        }

        if (resultadoDiagnostico.status === "fulfilled") {
            setDuplicados(resultadoDiagnostico.value.data);
        } else {
            setDuplicados([]);
            setErrorDiagnostico(true);
        }

        setCargando(false);
    }, []);

    useEffect(() => {
        // Se recarga al montar y cada vez que cambia refreshSignal (mismo patrón que MovementsTable).
        async function cargarInicial() {
            await cargarDatos();
        }

        cargarInicial();
    }, [cargarDatos, refreshSignal]);

    const idsDuplicados = new Set(duplicados.flatMap((grupo) => grupo.categorias.map((c) => c.CATId)));

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Mis categorías</h2>
                <p className="text-sm text-zinc-400">Categorías activas e inactivas, ordenadas por nombre.</p>
            </div>

            {cargando && (
                <p
                    role="status"
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400"
                >
                    Cargando categorías…
                </p>
            )}

            {!cargando && error && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between"
                >
                    <p>{error}</p>
                    <button
                        type="button"
                        className="self-start rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10 sm:self-auto"
                        onClick={() => void cargarDatos()}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {!cargando && !error && categorias.length === 0 && (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    Todavía no tienes categorías. Crea tu primera categoría para clasificar tus ingresos, gastos y
                    ahorros.
                </p>
            )}

            {!cargando && !error && categorias.length > 0 && (
                <>
                    {duplicados.length > 0 && (
                        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                            <p className="font-medium">Posibles categorías duplicadas</p>
                            <p className="text-amber-200/80">
                                Estas categorías tienen el mismo tipo y nombre. No se modificaron; puedes revisarlas.
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {duplicados.map((grupo) => (
                                    <li key={`${grupo.tipo}-${grupo.nombreNormalizado}`} className="break-words">
                                        {etiquetaTipo(grupo.tipo)}:{" "}
                                        {grupo.categorias
                                            .map((c) => `"${c.CATNombre}"${c.CATActiva ? "" : " (inactiva)"}`)
                                            .join(", ")}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {errorDiagnostico && (
                        <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                            No se pudo comprobar si hay categorías duplicadas. La lista se muestra igualmente.
                        </p>
                    )}

                    <ul className="space-y-3">
                        {categorias.map((categoria) => (
                            <li
                                key={categoria.CATId}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {categoria.CATColor ? (
                                        <span
                                            aria-hidden="true"
                                            className="h-4 w-4 shrink-0 rounded-full border border-zinc-700"
                                            // Color definido por el usuario: no se puede expresar con clases fijas.
                                            style={{ backgroundColor: categoria.CATColor }}
                                        />
                                    ) : (
                                        <span
                                            aria-hidden="true"
                                            className="h-4 w-4 shrink-0 rounded-full border border-dashed border-zinc-700"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <p className="break-words font-medium">{categoria.CATNombre}</p>
                                        <p className={`text-sm ${colorTipo(categoria.CATTipo)}`}>
                                            {etiquetaTipo(categoria.CATTipo)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {idsDuplicados.has(categoria.CATId) && (
                                        <span className="rounded-full border border-amber-500/40 px-2.5 py-1 text-xs font-medium text-amber-200">
                                            Duplicada
                                        </span>
                                    )}
                                    <span
                                        className={
                                            categoria.CATActiva
                                                ? "rounded-full border border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-300"
                                                : "rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-400"
                                        }
                                    >
                                        {categoria.CATActiva ? "Activa" : "Inactiva"}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
