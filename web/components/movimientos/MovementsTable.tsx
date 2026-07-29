"use client";

// components/movimientos/MovementsTable.tsx
import { useEffect, useState } from "react";
import { getCuentasActivas } from "@/services/cuentas.service";
import { getCategoriasActivas } from "@/services/categorias.service";
import { desactivarMovimiento, editarMovimiento, getMovimientos } from "@/services/movimientos.service";
import { Cuenta } from "@/types/cuenta";
import { Categoria } from "@/types/categoria";
import { Movimiento, TIPOS_MOVIMIENTO, TipoMovimiento } from "@/types/movimiento";

interface MovementsTableProps {
    refreshSignal: number;
}

interface FormularioEdicion {
    tipo: TipoMovimiento;
    monto: string;
    descripcion: string;
    cuentaId: string;
    categoriaId: string;
    fecha: string;
}

// Convierte "YYYY-MM-DDTHH:mm:ss.sssZ" a "DD/MM/YYYY" operando sobre el texto,
// sin construir un Date local, para no desplazar el día por zona horaria.
function formatearFecha(fechaIso: string): string {
    const [anio, mes, dia] = fechaIso.slice(0, 10).split("-");
    return `${dia}/${mes}/${anio}`;
}

function formatearMonto(monto: string): string {
    const numero = Number(monto);
    return Number.isFinite(numero) ? numero.toFixed(2) : monto;
}

function etiquetaTipo(tipo: TipoMovimiento): string {
    return tipo === "INGRESO" ? "Ingreso" : tipo === "GASTO" ? "Gasto" : "Ahorro";
}

function colorTipo(tipo: TipoMovimiento): string {
    if (tipo === "INGRESO") return "text-emerald-400";
    if (tipo === "GASTO") return "text-red-400";
    return "text-sky-400";
}

export default function MovementsTable({ refreshSignal }: MovementsTableProps) {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [formularioEdicion, setFormularioEdicion] = useState<FormularioEdicion | null>(null);
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);
    const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
    const [desactivandoId, setDesactivandoId] = useState<number | null>(null);

    async function cargarDatos() {
        setCargando(true);
        setError(null);

        try {
            const [movimientosResponse, cuentasActivas, categoriasActivas] = await Promise.all([
                getMovimientos(),
                getCuentasActivas(),
                getCategoriasActivas(),
            ]);

            setMovimientos(movimientosResponse.data);
            setCuentas(cuentasActivas);
            setCategorias(categoriasActivas);
        } catch (excepcion) {
            setError(excepcion instanceof Error ? excepcion.message : "Error al obtener movimientos.");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        // Se recarga únicamente cuando cambia refreshSignal (tras crear un movimiento).
        async function cargarInicial() {
            await cargarDatos();
        }

        cargarInicial();
    }, [refreshSignal]);

    function iniciarEdicion(movimiento: Movimiento) {
        setEditandoId(movimiento.MOVId);
        setErrorEdicion(null);
        setFormularioEdicion({
            tipo: movimiento.MOVTipo,
            monto: movimiento.MOVMonto,
            descripcion: movimiento.MOVDescripcion ?? "",
            cuentaId: String(movimiento.CUEId),
            categoriaId: movimiento.CATId ? String(movimiento.CATId) : "",
            fecha: movimiento.MOVFecha.slice(0, 10),
        });
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormularioEdicion(null);
        setErrorEdicion(null);
    }

    async function guardarEdicion(id: number) {
        if (!formularioEdicion) return;

        const monto = Number(formularioEdicion.monto);
        if (!Number.isFinite(monto) || monto <= 0) {
            setErrorEdicion("El monto debe ser un número mayor a 0.");
            return;
        }

        if (!formularioEdicion.cuentaId) {
            setErrorEdicion("Selecciona una cuenta.");
            return;
        }

        if (!formularioEdicion.fecha) {
            setErrorEdicion("Selecciona una fecha.");
            return;
        }

        setGuardandoEdicion(true);
        setErrorEdicion(null);

        try {
            await editarMovimiento(id, {
                CUEId: Number(formularioEdicion.cuentaId),
                CATId: formularioEdicion.categoriaId ? Number(formularioEdicion.categoriaId) : null,
                MOVTipo: formularioEdicion.tipo,
                MOVMonto: monto,
                MOVDescripcion: formularioEdicion.descripcion.trim() ? formularioEdicion.descripcion.trim() : null,
                MOVFecha: formularioEdicion.fecha,
            });

            cancelarEdicion();
            await cargarDatos();
        } catch (excepcion) {
            setErrorEdicion(excepcion instanceof Error ? excepcion.message : "Error al actualizar el movimiento.");
        } finally {
            setGuardandoEdicion(false);
        }
    }

    async function manejarDesactivar(movimiento: Movimiento) {
        const confirmado = window.confirm(
            `¿Desactivar el movimiento "${movimiento.MOVDescripcion ?? etiquetaTipo(movimiento.MOVTipo)}"?`
        );

        if (!confirmado) return;

        setDesactivandoId(movimiento.MOVId);
        setError(null);

        try {
            await desactivarMovimiento(movimiento.MOVId);
            await cargarDatos();
        } catch (excepcion) {
            setError(excepcion instanceof Error ? excepcion.message : "Error al desactivar el movimiento.");
        } finally {
            setDesactivandoId(null);
        }
    }

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Movimientos registrados</h2>
                <p className="text-sm text-zinc-400">
                    Ingresos, gastos y ahorros activos.
                </p>
            </div>

            {cargando && (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    Cargando movimientos...
                </p>
            )}

            {!cargando && error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                </p>
            )}

            {!cargando && !error && movimientos.length === 0 && (
                <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    Todavía no hay movimientos registrados.
                </p>
            )}

            {!cargando && !error && movimientos.length > 0 && (
                <div className="space-y-3">
                    {movimientos.map((movimiento) => {
                        const enEdicion = editandoId === movimiento.MOVId;

                        if (enEdicion && formularioEdicion) {
                            return (
                                <div
                                    key={movimiento.MOVId}
                                    className="grid gap-3 rounded-xl border border-violet-500/50 bg-zinc-950 p-4"
                                >
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <select
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                            value={formularioEdicion.tipo}
                                            onChange={(evento) =>
                                                setFormularioEdicion({
                                                    ...formularioEdicion,
                                                    tipo: evento.target.value as TipoMovimiento,
                                                })
                                            }
                                        >
                                            {TIPOS_MOVIMIENTO.map((tipo) => (
                                                <option key={tipo} value={tipo}>
                                                    {etiquetaTipo(tipo)}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                            value={formularioEdicion.monto}
                                            onChange={(evento) =>
                                                setFormularioEdicion({ ...formularioEdicion, monto: evento.target.value })
                                            }
                                        />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Descripción"
                                        className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                        value={formularioEdicion.descripcion}
                                        onChange={(evento) =>
                                            setFormularioEdicion({ ...formularioEdicion, descripcion: evento.target.value })
                                        }
                                    />

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <select
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                            value={formularioEdicion.cuentaId}
                                            onChange={(evento) =>
                                                setFormularioEdicion({ ...formularioEdicion, cuentaId: evento.target.value })
                                            }
                                        >
                                            {cuentas.map((cuenta) => (
                                                <option key={cuenta.CUEId} value={cuenta.CUEId}>
                                                    {cuenta.CUENombre}
                                                </option>
                                            ))}
                                        </select>

                                        <select
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                            value={formularioEdicion.categoriaId}
                                            onChange={(evento) =>
                                                setFormularioEdicion({ ...formularioEdicion, categoriaId: evento.target.value })
                                            }
                                        >
                                            <option value="">Sin categoría</option>
                                            {categorias.map((categoria) => (
                                                <option key={categoria.CATId} value={categoria.CATId}>
                                                    {categoria.CATNombre}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="date"
                                            className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm outline-none focus:border-violet-500"
                                            value={formularioEdicion.fecha}
                                            onChange={(evento) =>
                                                setFormularioEdicion({ ...formularioEdicion, fecha: evento.target.value })
                                            }
                                        />
                                    </div>

                                    {errorEdicion && <p className="text-sm text-red-300">{errorEdicion}</p>}

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            onClick={() => guardarEdicion(movimiento.MOVId)}
                                            disabled={guardandoEdicion}
                                        >
                                            {guardandoEdicion ? "Guardando..." : "Guardar"}
                                        </button>

                                        <button
                                            type="button"
                                            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            onClick={cancelarEdicion}
                                            disabled={guardandoEdicion}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={movimiento.MOVId}
                                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                            >
                                <div>
                                    <p className="font-medium">
                                        {movimiento.MOVDescripcion || etiquetaTipo(movimiento.MOVTipo)}
                                    </p>
                                    <p className="text-sm text-zinc-500">
                                        {movimiento.categoria?.CATNombre ?? "Sin categoría"} · {movimiento.cuenta.CUENombre} ·{" "}
                                        {formatearFecha(movimiento.MOVFecha)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <p className={`font-bold ${colorTipo(movimiento.MOVTipo)}`}>
                                        {movimiento.MOVTipo === "GASTO" ? "-" : "+"}Q{formatearMonto(movimiento.MOVMonto)}
                                    </p>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium transition hover:bg-zinc-800"
                                            onClick={() => iniciarEdicion(movimiento)}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                            onClick={() => manejarDesactivar(movimiento)}
                                            disabled={desactivandoId === movimiento.MOVId}
                                        >
                                            {desactivandoId === movimiento.MOVId ? "Desactivando..." : "Desactivar"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
