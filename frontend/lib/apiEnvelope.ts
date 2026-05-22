import { api } from "@/lib/api";

type ApiEnvelope<T> = { success: boolean; data: T; meta?: Record<string, unknown> };

export async function apiGet<T>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  if (!data.success) {
    throw new Error("Request failed");
  }
  return data.data;
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const { data } = await api.post<ApiEnvelope<T>>(url, body);
  if (!data.success) {
    throw new Error("Request failed");
  }
  return data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiEnvelope<T>>(url, body);
  if (!data.success) {
    throw new Error("Request failed");
  }
  return data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiEnvelope<T>>(url);
  if (!data.success) {
    throw new Error("Request failed");
  }
  return data.data;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const r = err as {
      response?: { data?: { message?: string | string[]; errors?: unknown[] } };
    };
    const d = r.response?.data;
    const m = d?.message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
    if (d?.errors?.length) {
      return d.errors.map((e) => String(e)).join(", ");
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
