// web/components/movimientos/CreateMovementForm.tsx
export default function CreateMovementForm() {
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

            <form className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Tipo */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Tipo
                        </label>

                        <select className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500">
                            <option>Ingreso</option>
                            <option>Gasto</option>
                            <option>Ahorro</option>
                        </select>
                    </div>

                    {/* Monto */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Monto
                        </label>

                        <input
                            type="number"
                            placeholder="0.00"
                            className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500"
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
                        className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500"
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Cuenta */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Cuenta
                        </label>

                        <select className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500">
                            <option>BI Sueldo</option>
                            <option>BAC Ahorro General</option>
                            <option>BAC Viaje</option>
                            <option>Gastos y Hobbies</option>
                        </select>
                    </div>

                    {/* Categoría */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-zinc-400">
                            Categoría
                        </label>

                        <select className="rounded-xl border border-zinc-700 bg-zinc-950 p-3 outline-none transition focus:border-violet-500">
                            <option>Salario</option>
                            <option>Comida</option>
                            <option>Libros</option>
                            <option>Juegos</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    className="mt-2 rounded-xl bg-violet-600 px-4 py-3 font-medium transition hover:bg-violet-500"
                >
                    Registrar movimiento
                </button>
            </form>
        </section>
    );
}