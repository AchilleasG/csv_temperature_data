export type ApiErrorDetail = unknown;

export class ApiError extends Error {
  status: number;
  detail: ApiErrorDetail;

  constructor(status: number, message: string, detail: ApiErrorDetail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await resp.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!resp.ok) {
    throw new ApiError(resp.status, `${resp.status} ${resp.statusText}`, parsed?.detail ?? parsed);
  }
  return parsed as T;
}

