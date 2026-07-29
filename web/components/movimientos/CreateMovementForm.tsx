"use client";

// components/movimientos/CreateMovementForm.tsx
import { FormEvent, useEffect, useState } from "react";
import { getUsuarios } from "@/services/usuarios.service";
import { getCuentasActivas } from "@/services/cuentas.service";
import { getCategoriasActivas } from "@/services/categorias.service";
import { crearMovimiento } from "@/services/movimientos.service";
import { Cuenta } from "@/types/cuenta";
import { Categoria } from "@/types/categoria";
import { TIPOS_MOVIMIENTO, TipoMovimiento } from "@/types/movimiento";

interface CreateMovementFormProps {
    onMovimientoCreado: () => void;
}

interface EstadoFormulario {
    tipo: TipoMovimiento;
    monto: string;
    descripcion: string;
    cuentaId: string;
    categoriaId: string;
    fecha: string;
}

const ESTADO_INICIAL: EstadoFormulario = {
    tipo: "INGRESO",
    monto: "",
    descripcion: "",
    cuentaId: "",
    categoriaId: "",
    fecha: "",
};

function etiquetaTipo(tipo: TipoMovimiento): string {
    return tipo === "INGRESO" ? "Ingreso" : tipo === "GASTO" ? "Gasto" : "Ahorro";
}

export default function CreateMovementForm({ onMovimientoCreado }: CreateMovementFormProps) {
    const [usuarioId, setUsuarioId] = useState<number | null>(null);
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargandoOpciones, setCargandoOpciones] = useState(true);
    const [errorOpciones, setErrorOpciones] = useState<string | null>(null);

    const [form, setForm] = useState<EstadoFormulario>(ESTADO_INICIAL);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function cargarOpciones() {
            setCargandoOpciones(true);
            setErrorOpciones(null);

            try {
                const [usuariosResponse, cuentasActivas, categoriasActivas] = await Promise.all([
                    getUsuarios(),
                    getCuentasActivas(),
                    getCategoriasActivas(),
                ]);

                setUsuarioId(usuariosResponse.data[0]?.USUId ?? null);
                setCuentas(cuentasActivas);
                setCategorias(categoriasActivas);
            } catch {
                setErrorOpciones("No se pudo cargar la información necesaria para registrar movimientos.");
            } finally {
                setCargandoOpciones(false);
            }
        }

        cargarOpciones();
    }, []);

    async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        setError(null);

        if (!usuarioId) {
            setError("No existe un usuario disponible para registrar el movimiento.");
            return;
        }

        const monto = Number(form.monto);
        if (!Number.isFinite(monto) || monto <= 0) {
            setError("El monto debe ser un número mayor a 0.");
            return;
        }

        if (!form.cuentaId) {
            setError("Selecciona una cuenta.");
            return;
        }

        if (!form.fecha) {
            setError("Selecciona una fecha.");
            return;
        }

        setEnviando(true);

        try {
            await crearMovimiento({
                USUId: usuarioId,
                CUEId: Number(form.cuentaId),
                CATId: form.categoriaId ? Number(form.categoriaId) : null,
                MOVTipo: form.tipo,
                MOVMonto: monto,
                MOVDescripcion: form.descripcion.trim() ? form.descripcion.trim() : null,
                // Se envía la fecha "YYYY-MM-DD" del input tal cual, sin pasar por
                // un Date local, para que el día guardado sea siempre el elegido
                // por el usuario, sin desplazamientos por zona horaria.
                MOVFecha: form.fecha,
            });

            setForm(ESTADO_INICIAL);
            onMovimientoCreado();
        } catch (excepcion) {
            setError(excepcion instanceof Error ? excepcion.message : "Error al registrar el movimiento.");
        } finally {
            setEnviando(false);
        }
    }

    const sinCuentasDisponibles = !cargandoOpciones && !errorOpciones && cuentas.length === 0;
    const formularioBloqueado = cargandoOpciones || !!errorOpciones || !usuarioId || sinCuentasDisponibles;

    return (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-5">
                <h2 className="text-lg font-semibold">
                    Registrar movimiento
                </h2>

                <p className="text-sm text-zinc-400">
                    Agrega ingresos, gastos o ahorros manualmente.
                </p>
            </div>

            {errorOpciones && (
                <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {errorOpciones}
                </p>
            )}

            {!cargandoOpciones && !errorOpciones && !usuarioId && (
                <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                    No existe ningún usuario registrado. No es posible crear movimientos.
                </p>
            )}

            {sinCuentasDisponibles && (
                <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                    No hay cuentas activas disponibles. No es posible crear movimientos.
                </p>
            )}

            <form className="grid gap-4" onSubmit={manejarEnvio}>
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Tipo */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Tipo
                        </label>

                        <select
                            className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                            value={form.tipo}
                            onChange={(evento) => setForm({ ...form, tipo: evento.target.value as TipoMovimiento })}
                            disabled={formularioBloqueado || enviando}
                        >
                            {TIPOS_MOVIMIENTO.map((tipo) => (
                                <option key={tipo} value={tipo}>
                                    {etiquetaTipo(tipo)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Monto */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Monto
                        </label>

                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                            value={form.monto}
                            onChange={(evento) => setForm({ ...form, monto: evento.target.value })}
                            disabled={formularioBloqueado || enviando}
                        />
                    </div>
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-zinc-400">
                        Descripción
                    </label>

                    <input
                        type="text"
                        placeholder="Ej: Compra de libro"
                        className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                        value={form.descripcion}
                        onChange={(evento) => setForm({ ...form, descripcion: evento.target.value })}
                        disabled={formularioBloqueado || enviando}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Cuenta */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Cuenta
                        </label>

                        <select
                            className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                            value={form.cuentaId}
                            onChange={(evento) => setForm({ ...form, cuentaId: evento.target.value })}
                            disabled={formularioBloqueado || enviando}
                        >
                            <option value="">
                                {cargandoOpciones ? "Cargando cuentas..." : "Selecciona una cuenta"}
                            </option>
                            {cuentas.map((cuenta) => (
                                <option key={cuenta.CUEId} value={cuenta.CUEId}>
                                    {cuenta.CUENombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Categoría */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Categoría
                        </label>

                        <select
                            className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                            value={form.categoriaId}
                            onChange={(evento) => setForm({ ...form, categoriaId: evento.target.value })}
                            disabled={formularioBloqueado || enviando}
                        >
                            <option value="">
                                {cargandoOpciones ? "Cargando categorías..." : "Sin categoría"}
                            </option>
                            {categorias.map((categoria) => (
                                <option key={categoria.CATId} value={categoria.CATId}>
                                    {categoria.CATNombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Fecha */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm text-zinc-400">
                        Fecha
                    </label>

                    <input
                        type="date"
                        className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500 disabled:opacity-50"
                        value={form.fecha}
                        onChange={(evento) => setForm({ ...form, fecha: evento.target.value })}
                        disabled={formularioBloqueado || enviando}
                    />
                </div>

                {error && (
                    <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    className="mt-2 rounded-xl bg-violet-600 px-4 py-3 font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={formularioBloqueado || enviando}
                >
                    {enviando ? "Registrando..." : "Registrar movimiento"}
                </button>
            </form>
        </section>
    );
}
