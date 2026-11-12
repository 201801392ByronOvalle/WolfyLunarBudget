"use client";

// components/categorias/CategoryForm.tsx
// Formulario de creación de categorías (US2). La validación del cliente es una ayuda de uso; la
// validación definitiva, la unicidad y el usuario propietario los decide la API.
import { FormEvent, useRef, useState } from "react";
import { crearCategoria } from "@/services/categorias.service";
import { TipoCategoria } from "@/types/categoria";

interface CategoryFormProps {
    onCategoriaCreada: () => void;
}

type Campo = "nombre" | "tipo" | "color" | "icono";
type ErroresCampo = Partial<Record<Campo, string>>;

interface Formulario {
    nombre: string;
    tipo: TipoCategoria | "";
    color: string;
    icono: string;
}

const LONGITUD_MAXIMA = 50;
const PATRON_COLOR = /^#[0-9a-fA-F]{6}$/;
const COLOR_SELECTOR_POR_OMISION = "#7c3aed";
const ORDEN_CAMPOS: Campo[] = ["nombre", "tipo", "color", "icono"];
const FORMULARIO_INICIAL: Formulario = { nombre: "", tipo: "", color: "", icono: "" };

const MENSAJES_CAMPO: Record<Campo, string> = {
    nombre: "Escribe un nombre de 1 a 50 caracteres.",
    tipo: "Elige si la categoría es de ingreso, gasto o ahorro.",
    color: "Usa el formato #RRGGBB (por ejemplo #7C3AED) o deja el campo vacío.",
    icono: "El ícono admite hasta 50 caracteres.",
};

// Prefijos de los mensajes de validación de la API (contracts/categorias.md).
const PREFIJOS_API: Record<string, Campo> = {
    CATNombre: "nombre",
    CATTipo: "tipo",
    CATColor: "color",
    CATIcono: "icono",
};

const OPCIONES_TIPO: { valor: TipoCategoria; etiqueta: string; ejemplo: string; punto: string; marcado: string }[] = [
    {
        valor: "ingreso",
        etiqueta: "Ingreso",
        ejemplo: "Sueldo, ventas",
        punto: "bg-emerald-400",
        marcado: "has-checked:border-emerald-400/70 has-checked:bg-emerald-400/10",
    },
    {
        valor: "gasto",
        etiqueta: "Gasto",
        ejemplo: "Comida, transporte",
        punto: "bg-red-400",
        marcado: "has-checked:border-red-400/70 has-checked:bg-red-400/10",
    },
    {
        valor: "ahorro",
        etiqueta: "Ahorro",
        ejemplo: "Fondo de emergencia",
        punto: "bg-sky-400",
        marcado: "has-checked:border-sky-400/70 has-checked:bg-sky-400/10",
    },
];

const CLASE_CONTROL =
    "w-full rounded-xl border bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50";

function claseControl(conError: boolean): string {
    return `${CLASE_CONTROL} ${conError ? "border-red-500/70" : "border-zinc-700 hover:border-zinc-600"}`;
}

function validar(formulario: Formulario): ErroresCampo {
    const errores: ErroresCampo = {};
    const nombre = formulario.nombre.trim();
    if (nombre === "" || nombre.length > LONGITUD_MAXIMA) errores.nombre = MENSAJES_CAMPO.nombre;
    if (formulario.tipo === "") errores.tipo = MENSAJES_CAMPO.tipo;
    const color = formulario.color.trim();
    if (color !== "" && !PATRON_COLOR.test(color)) errores.color = MENSAJES_CAMPO.color;
    if (formulario.icono.trim().length > LONGITUD_MAXIMA) errores.icono = MENSAJES_CAMPO.icono;
    return errores;
}

// Asocia un rechazo de la API al campo que corresponde: los de validación se muestran con el texto
// del formulario; el de duplicado conserva el mensaje de la API (nombra la categoría existente).
function errorDeApi(mensaje: string): { campo: Campo; texto: string } | null {
    if (mensaje.startsWith("Ya existe la categoría")) return { campo: "nombre", texto: mensaje };
    const prefijo = Object.keys(PREFIJOS_API).find((clave) => mensaje.startsWith(clave));
    if (!prefijo) return null;
    const campo = PREFIJOS_API[prefijo];
    return { campo, texto: MENSAJES_CAMPO[campo] };
}

export default function CategoryForm({ onCategoriaCreada }: CategoryFormProps) {
    const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_INICIAL);
    const [errores, setErrores] = useState<ErroresCampo>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    const nombreRef = useRef<HTMLInputElement>(null);
    const tipoRef = useRef<HTMLInputElement>(null);
    const colorRef = useRef<HTMLInputElement>(null);
    const iconoRef = useRef<HTMLInputElement>(null);

    // Solo se llama desde el manejador de envío (nunca durante el render).
    function enfocar(campo: Campo) {
        const referencia = { nombre: nombreRef, tipo: tipoRef, color: colorRef, icono: iconoRef }[campo];
        referencia.current?.focus();
    }

    function actualizar(campo: Campo, valor: string) {
        setFormulario((actual) => ({ ...actual, [campo]: valor }));
        setErrores((actuales) => (actuales[campo] ? { ...actuales, [campo]: undefined } : actuales));
        setMensajeExito(null);
    }

    async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        if (enviando) return;

        setErrorGeneral(null);
        setMensajeExito(null);

        const erroresValidacion = validar(formulario);
        setErrores(erroresValidacion);
        const primerError = ORDEN_CAMPOS.find((campo) => erroresValidacion[campo]);
        if (primerError) {
            enfocar(primerError);
            return;
        }

        setEnviando(true);
        try {
            const respuesta = await crearCategoria({
                CATNombre: formulario.nombre.trim(),
                CATTipo: formulario.tipo as TipoCategoria,
                CATColor: formulario.color.trim() || null,
                CATIcono: formulario.icono.trim() || null,
            });
            setFormulario(FORMULARIO_INICIAL);
            setMensajeExito(`Categoría “${respuesta.data.CATNombre}” creada.`);
            onCategoriaCreada();
        } catch (excepcion) {
            // Los rechazos de la API llegan como Error con su mensaje; un fallo de red o una
            // respuesta ilegible llega con otro tipo de error.
            const esRechazoApi = excepcion instanceof Error && excepcion.name === "Error";
            if (!esRechazoApi) {
                setErrorGeneral("No se pudo conectar con el servidor. Tus datos siguen aquí; inténtalo de nuevo.");
                return;
            }
            const asociado = errorDeApi(excepcion.message);
            if (asociado) {
                setErrores({ [asociado.campo]: asociado.texto });
                enfocar(asociado.campo);
            } else {
                setErrorGeneral(excepcion.message);
            }
        } finally {
            setEnviando(false);
        }
    }

    const colorValido = PATRON_COLOR.test(formulario.color.trim());
    const longitudNombre = formulario.nombre.trim().length;

    return (
        <section aria-labelledby="titulo-nueva-categoria" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
            <div className="mb-6">
                <h2 id="titulo-nueva-categoria" className="text-lg font-semibold text-balance">
                    Nueva categoría
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                    Clasifica tus movimientos. El nombre debe ser único dentro de cada tipo.
                </p>
            </div>

            <form className="grid gap-6" onSubmit={manejarEnvio} noValidate>
                {/* Nombre */}
                <div className="grid gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                        <label htmlFor="categoria-nombre" className="text-sm font-medium text-zinc-200">
                            Nombre
                        </label>
                        <span className="text-xs text-zinc-400 tabular-nums" aria-hidden="true">
                            {longitudNombre}/{LONGITUD_MAXIMA}
                        </span>
                    </div>
                    <input
                        ref={nombreRef}
                        id="categoria-nombre"
                        name="nombre"
                        type="text"
                        autoComplete="off"
                        placeholder="Ej.: Mascotas…"
                        maxLength={LONGITUD_MAXIMA + 20}
                        className={claseControl(Boolean(errores.nombre))}
                        value={formulario.nombre}
                        onChange={(evento) => actualizar("nombre", evento.target.value)}
                        disabled={enviando}
                        aria-invalid={Boolean(errores.nombre)}
                        aria-describedby={errores.nombre ? "categoria-nombre-error" : undefined}
                        required
                    />
                    {errores.nombre ? (
                        <p id="categoria-nombre-error" className="text-sm text-red-300">
                            {errores.nombre}
                        </p>
                    ) : null}
                </div>

                {/* Tipo */}
                <fieldset
                    className="grid gap-2"
                    aria-invalid={Boolean(errores.tipo)}
                    aria-describedby={errores.tipo ? "categoria-tipo-error" : undefined}
                    disabled={enviando}
                >
                    <legend className="mb-2 text-sm font-medium text-zinc-200">Tipo</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {OPCIONES_TIPO.map((opcion, indice) => (
                            <label
                                key={opcion.valor}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-zinc-950 p-3 transition-colors hover:border-zinc-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-violet-500 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${
                                    errores.tipo ? "border-red-500/70" : "border-zinc-700"
                                } ${opcion.marcado}`}
                            >
                                <input
                                    ref={indice === 0 ? tipoRef : undefined}
                                    type="radio"
                                    name="tipo"
                                    value={opcion.valor}
                                    checked={formulario.tipo === opcion.valor}
                                    onChange={() => actualizar("tipo", opcion.valor)}
                                    className="sr-only"
                                />
                                <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${opcion.punto}`} />
                                <span className="grid">
                                    <span className="text-sm font-medium text-zinc-100">{opcion.etiqueta}</span>
                                    <span className="text-xs text-zinc-400">{opcion.ejemplo}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {errores.tipo ? (
                        <p id="categoria-tipo-error" className="text-sm text-red-300">
                            {errores.tipo}
                        </p>
                    ) : null}
                </fieldset>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Color */}
                    <div className="grid gap-2 content-start">
                        <label htmlFor="categoria-color" className="text-sm font-medium text-zinc-200">
                            Color <span className="font-normal text-zinc-400">(opcional)</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                ref={colorRef}
                                id="categoria-color"
                                name="color"
                                type="text"
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="#7C3AED…"
                                maxLength={7}
                                className={`${claseControl(Boolean(errores.color))} font-mono uppercase`}
                                value={formulario.color}
                                onChange={(evento) => actualizar("color", evento.target.value)}
                                disabled={enviando}
                                aria-invalid={Boolean(errores.color)}
                                aria-describedby={errores.color ? "categoria-color-error" : "categoria-color-ayuda"}
                            />
                            <input
                                type="color"
                                aria-label="Elegir color en el selector"
                                className="h-[46px] w-12 shrink-0 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 p-1 hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                value={colorValido ? formulario.color.trim() : COLOR_SELECTOR_POR_OMISION}
                                onChange={(evento) => actualizar("color", evento.target.value.toUpperCase())}
                                disabled={enviando}
                            />
                        </div>
                        {errores.color ? (
                            <p id="categoria-color-error" className="text-sm text-red-300">
                                {errores.color}
                            </p>
                        ) : (
                            <p id="categoria-color-ayuda" className="text-xs text-zinc-400">
                                Se muestra como una muestra junto al nombre.
                            </p>
                        )}
                    </div>

                    {/* Ícono */}
                    <div className="grid gap-2 content-start">
                        <label htmlFor="categoria-icono" className="text-sm font-medium text-zinc-200">
                            Ícono <span className="font-normal text-zinc-400">(opcional)</span>
                        </label>
                        <input
                            ref={iconoRef}
                            id="categoria-icono"
                            name="icono"
                            type="text"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Ej.: wallet…"
                            maxLength={LONGITUD_MAXIMA + 20}
                            className={claseControl(Boolean(errores.icono))}
                            value={formulario.icono}
                            onChange={(evento) => actualizar("icono", evento.target.value)}
                            disabled={enviando}
                            aria-invalid={Boolean(errores.icono)}
                            aria-describedby={errores.icono ? "categoria-icono-error" : "categoria-icono-ayuda"}
                        />
                        {errores.icono ? (
                            <p id="categoria-icono-error" className="text-sm text-red-300">
                                {errores.icono}
                            </p>
                        ) : (
                            <p id="categoria-icono-ayuda" className="text-xs text-zinc-400">
                                Identificador de texto, por ejemplo “wallet” o “piggy-bank”.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div aria-live="polite" className="min-h-5 min-w-0 text-sm">
                        {errorGeneral ? (
                            <p role="alert" className="text-red-300">
                                {errorGeneral}
                            </p>
                        ) : null}
                        {mensajeExito ? <p className="text-emerald-300">{mensajeExito}</p> : null}
                    </div>

                    <button
                        type="submit"
                        className="shrink-0 whitespace-nowrap rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={enviando}
                        aria-busy={enviando}
                    >
                        {enviando ? "Creando…" : "Crear categoría"}
                    </button>
                </div>
            </form>
        </section>
    );
}
