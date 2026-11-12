"use client";

// components/categorias/CategoryForm.tsx
// Formulario de creación (US2) y edición (US3) de categorías. La validación del cliente es una
// ayuda de uso; la validación definitiva, la unicidad y el usuario propietario los decide la API.
//
// En edición, cada campo se valida y se envía solo si cambió respecto del valor guardado (FR-026):
// un valor histórico que no se toca (por ejemplo, un tipo fuera de los tres valores) se conserva.
// El padre debe montar el formulario con `key` distinta por categoría para reiniciar su estado.
import { FormEvent, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { crearCategoria, editarCategoria } from "@/services/categorias.service";
import { Categoria, EditarCategoriaPayload, TIPOS_CATEGORIA, TipoCategoria } from "@/types/categoria";

interface CategoryFormProps {
    /** Categoría a editar; sin ella el formulario crea una nueva. */
    categoria?: Categoria | null;
    /** Mensaje de confirmación con el que se monta el formulario (por ejemplo, tras editar). */
    mensajeInicial?: string | null;
    onCategoriaCreada: () => void;
    onCategoriaEditada?: (categoria: Categoria) => void;
    onCancelarEdicion?: () => void;
}

type Campo = "nombre" | "tipo" | "color" | "icono";
type ErroresCampo = Partial<Record<Campo, string>>;

interface Formulario {
    nombre: string;
    // string y no TipoCategoria: una categoría histórica puede tener un tipo fuera de los tres.
    tipo: string;
    color: string;
    icono: string;
}

const LONGITUD_MAXIMA = 50;
const PATRON_COLOR = /^#[0-9a-fA-F]{6}$/;
const COLOR_SELECTOR_POR_OMISION = "#7c3aed";
const ORDEN_CAMPOS: Campo[] = ["nombre", "tipo", "color", "icono"];
const FORMULARIO_VACIO: Formulario = { nombre: "", tipo: "", color: "", icono: "" };
const AVISO_TIPO_CON_MOVIMIENTOS = "Las categorías con movimientos asociados no permiten cambiar su tipo.";

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

const CLASE_BOTON_PRIMARIO =
    "shrink-0 whitespace-nowrap rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60";

const CLASE_BOTON_SECUNDARIO =
    "shrink-0 whitespace-nowrap rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60";

function claseControl(conError: boolean): string {
    return `${CLASE_CONTROL} ${conError ? "border-red-500/70" : "border-zinc-700 hover:border-zinc-600"}`;
}

function formularioDesde(categoria: Categoria): Formulario {
    return {
        nombre: categoria.CATNombre,
        tipo: categoria.CATTipo,
        color: categoria.CATColor ?? "",
        icono: categoria.CATIcono ?? "",
    };
}

// Qué campos tocó el usuario respecto del valor cargado. Se compara el texto tal cual (sin recortar)
// para que un valor histórico con espacios que no se edita no se envíe ni se normalice (FR-026).
// La API vuelve a comparar contra lo persistido y es quien decide.
function camposCambiados(formulario: Formulario, original: Formulario): Record<Campo, boolean> {
    return {
        nombre: formulario.nombre !== original.nombre,
        tipo: formulario.tipo !== original.tipo,
        color: formulario.color !== original.color,
        icono: formulario.icono !== original.icono,
    };
}

// En creación se valida todo; en edición, solo lo que cambió.
function validar(formulario: Formulario, cambiados: Record<Campo, boolean> | null): ErroresCampo {
    const errores: ErroresCampo = {};
    const debeValidar = (campo: Campo) => cambiados === null || cambiados[campo];

    const nombre = formulario.nombre.trim();
    if (debeValidar("nombre") && (nombre === "" || nombre.length > LONGITUD_MAXIMA)) {
        errores.nombre = MENSAJES_CAMPO.nombre;
    }
    if (debeValidar("tipo") && !(TIPOS_CATEGORIA as readonly string[]).includes(formulario.tipo)) {
        errores.tipo = MENSAJES_CAMPO.tipo;
    }
    const color = formulario.color.trim();
    if (debeValidar("color") && color !== "" && !PATRON_COLOR.test(color)) errores.color = MENSAJES_CAMPO.color;
    if (debeValidar("icono") && formulario.icono.trim().length > LONGITUD_MAXIMA) errores.icono = MENSAJES_CAMPO.icono;
    return errores;
}

// Asocia un rechazo de la API al campo que corresponde: los de validación se muestran con el texto
// del formulario; los de duplicado y tipo con movimientos conservan el mensaje de la API.
function errorDeApi(mensaje: string): { campo: Campo; texto: string } | null {
    if (mensaje.startsWith("Ya existe la categoría")) return { campo: "nombre", texto: mensaje };
    if (mensaje.startsWith("No se puede cambiar el tipo")) return { campo: "tipo", texto: mensaje };
    const prefijo = Object.keys(PREFIJOS_API).find((clave) => mensaje.startsWith(clave));
    if (!prefijo) return null;
    const campo = PREFIJOS_API[prefijo];
    return { campo, texto: MENSAJES_CAMPO[campo] };
}

export default function CategoryForm({
    categoria = null,
    mensajeInicial = null,
    onCategoriaCreada,
    onCategoriaEditada,
    onCancelarEdicion,
}: CategoryFormProps) {
    const enEdicion = categoria !== null;
    const original = categoria ? formularioDesde(categoria) : FORMULARIO_VACIO;

    const [formulario, setFormulario] = useState<Formulario>(original);
    const [errores, setErrores] = useState<ErroresCampo>({});
    const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
    const [mensajeExito, setMensajeExito] = useState<string | null>(mensajeInicial);
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

    // Registra el rechazo y devuelve el campo que debe recibir el foco, si corresponde a uno.
    function manejarRechazo(excepcion: unknown): Campo | null {
        // Los rechazos de la API llegan como Error con su mensaje; un fallo de red o una respuesta
        // ilegible llega con otro tipo de error.
        const esRechazoApi = excepcion instanceof Error && excepcion.name === "Error";
        if (!esRechazoApi) {
            setErrorGeneral("No se pudo conectar con el servidor. Tus datos siguen aquí; inténtalo de nuevo.");
            return null;
        }
        const asociado = errorDeApi(excepcion.message);
        if (asociado) {
            setErrores({ [asociado.campo]: asociado.texto });
            return asociado.campo;
        }
        setErrorGeneral(excepcion.message);
        return null;
    }

    // Los campos están deshabilitados mientras se envía: se reactivan de forma síncrona antes de
    // mover el foco, porque un control deshabilitado no puede recibirlo.
    function terminarEnvio(campoConError: Campo | null) {
        flushSync(() => setEnviando(false));
        if (campoConError) enfocar(campoConError);
    }

    async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        if (enviando) return;

        setErrorGeneral(null);
        setMensajeExito(null);

        const cambiados = enEdicion ? camposCambiados(formulario, original) : null;
        const erroresValidacion = validar(formulario, cambiados);
        setErrores(erroresValidacion);
        const primerError = ORDEN_CAMPOS.find((campo) => erroresValidacion[campo]);
        if (primerError) {
            enfocar(primerError);
            return;
        }

        if (categoria && cambiados) {
            const payload: EditarCategoriaPayload = {};
            if (cambiados.nombre) payload.CATNombre = formulario.nombre.trim();
            if (cambiados.tipo) payload.CATTipo = formulario.tipo as TipoCategoria;
            if (cambiados.color) payload.CATColor = formulario.color.trim() || null;
            if (cambiados.icono) payload.CATIcono = formulario.icono.trim() || null;
            if (Object.keys(payload).length === 0) {
                setErrorGeneral("No hay cambios por guardar.");
                return;
            }

            setEnviando(true);
            try {
                const respuesta = await editarCategoria(categoria.CATId, payload);
                // El padre vuelve al modo creación (nueva key): este formulario se desmonta.
                onCategoriaEditada?.(respuesta.data);
            } catch (excepcion) {
                terminarEnvio(manejarRechazo(excepcion));
            }
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
            setFormulario(FORMULARIO_VACIO);
            setMensajeExito(`Categoría “${respuesta.data.CATNombre}” creada.`);
            setEnviando(false);
            onCategoriaCreada();
        } catch (excepcion) {
            terminarEnvio(manejarRechazo(excepcion));
        }
    }

    const colorValido = PATRON_COLOR.test(formulario.color.trim());
    const longitudNombre = formulario.nombre.trim().length;
    const tipoHistorico =
        enEdicion && !(TIPOS_CATEGORIA as readonly string[]).includes(original.tipo) ? original.tipo : null;
    const descripcionTipo = [
        enEdicion ? "categoria-tipo-aviso" : null,
        errores.tipo ? "categoria-tipo-error" : null,
    ]
        .filter(Boolean)
        .join(" ");

    let textoBoton = enEdicion ? "Guardar cambios" : "Crear categoría";
    if (enviando) textoBoton = enEdicion ? "Guardando…" : "Creando…";

    return (
        <section
            aria-labelledby="titulo-formulario-categoria"
            className={`rounded-2xl border bg-zinc-900 p-5 sm:p-6 ${enEdicion ? "border-violet-500/50" : "border-zinc-800"}`}
        >
            <div className="mb-6">
                <h2 id="titulo-formulario-categoria" className="text-lg font-semibold text-balance">
                    {enEdicion ? "Editar categoría" : "Nueva categoría"}
                </h2>
                <p className="mt-1 break-words text-sm text-zinc-400">
                    {enEdicion
                        ? `Estás editando “${categoria.CATNombre.trim()}”. Solo se guardan los campos que cambies.`
                        : "Clasifica tus movimientos. El nombre debe ser único dentro de cada tipo."}
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
                        maxLength={Math.max(LONGITUD_MAXIMA + 20, original.nombre.length)}
                        className={claseControl(Boolean(errores.nombre))}
                        value={formulario.nombre}
                        onChange={(evento) => actualizar("nombre", evento.target.value)}
                        disabled={enviando}
                        // Edición iniciada por el usuario con «Editar»: el foco va al primer campo.
                        autoFocus={enEdicion}
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
                    aria-describedby={descripcionTipo || undefined}
                    disabled={enviando}
                >
                    <legend className="mb-2 text-sm font-medium text-zinc-200">Tipo</legend>
                    {enEdicion ? (
                        <p id="categoria-tipo-aviso" className="text-xs text-zinc-400">
                            {AVISO_TIPO_CON_MOVIMIENTOS}
                            {tipoHistorico
                                ? ` Tipo guardado: “${tipoHistorico}” (valor histórico); se conserva si no eliges otro.`
                                : null}
                        </p>
                    ) : null}
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
                    <div className="grid content-start gap-2">
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
                    <div className="grid content-start gap-2">
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

                    <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        {enEdicion ? (
                            <button
                                type="button"
                                className={CLASE_BOTON_SECUNDARIO}
                                onClick={onCancelarEdicion}
                                disabled={enviando}
                            >
                                Cancelar
                            </button>
                        ) : null}
                        <button type="submit" className={CLASE_BOTON_PRIMARIO} disabled={enviando} aria-busy={enviando}>
                            {textoBoton}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
