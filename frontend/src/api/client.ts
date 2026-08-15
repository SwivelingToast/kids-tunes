// Empty by default (same-origin, relative requests) - correct for
// production, where the backend also serves the built frontend from its
// own origin. Local dev overrides this via frontend/.env.development,
// since the Vite dev server (5173) and backend (3001) are different
// origins there.
export const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body && 'error' in body ? String((body as { error: unknown }).error) : `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (resp.status === 204) return undefined as T;

  const text = await resp.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!resp.ok) throw new ApiError(resp.status, body);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
