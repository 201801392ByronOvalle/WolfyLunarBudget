// services/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiGet<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Error al consumir API: ${response.status}`);
    }

    return response.json();
}

async function enviarJson<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(body ?? {}),
    });

    const payload = await response.json();

    if (!response.ok) {
        throw new Error(payload?.message ?? `Error al consumir API: ${response.status}`);
    }

    return payload;
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
    return enviarJson<T>(path, "POST", body);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    return enviarJson<T>(path, "PATCH", body);
}
