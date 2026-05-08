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