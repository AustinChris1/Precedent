"use client";

/** Browser-side fetch helpers. All engine traffic goes through /api/engine/*. */

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 200) || `request failed: ${res.status}`);
  }
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `request failed: ${res.status}`);
  }
  return data as T;
}

export const engine = {
  get: <T,>(p: string) => api<T>(`/api/engine/${p}`),
  post: <T,>(p: string, body?: unknown) =>
    api<T>(`/api/engine/${p}`, { method: "POST", body: JSON.stringify(body ?? {}) }),
};
