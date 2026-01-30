export type ApiErrorDetail = unknown;

export type ApiRequestKey =
  | "dataRange"
  | "stations"
  | "analyticsSummary"
  | "monthlyData"
  | "annualData";

export class ApiError extends Error {
  status: number;
  url: string;
  method: string;
  requestKey?: ApiRequestKey;
  contentType: string | null;
  detail: ApiErrorDetail;

  constructor(params: {
    status: number;
    message: string;
    url: string;
    method?: string;
    requestKey?: ApiRequestKey;
    contentType?: string | null;
    detail?: ApiErrorDetail;
  }) {
    super(params.message);
    this.status = params.status;
    this.url = params.url;
    this.method = params.method ?? "GET";
    this.requestKey = params.requestKey;
    this.contentType = params.contentType ?? null;
    this.detail = params.detail;
  }
}

function isJsonContentType(ct: string | null): boolean {
  if (!ct) return false;
  return ct.toLowerCase().includes("json");
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

async function readBody(resp: Response): Promise<{
  parsed: unknown | null;
  rawText: string;
  contentType: string | null;
  jsonParseFailed: boolean;
}> {
  const contentType = resp.headers.get("content-type");
  const rawText = await resp.text();
  if (!rawText) return { parsed: null, rawText: "", contentType, jsonParseFailed: false };

  const shouldParseJson = isJsonContentType(contentType) || looksLikeJson(rawText);
  if (!shouldParseJson) return { parsed: rawText, rawText, contentType, jsonParseFailed: false };

  try {
    return { parsed: JSON.parse(rawText), rawText, contentType, jsonParseFailed: false };
  } catch {
    // Keep the raw body around for debugging; surface a friendly error elsewhere.
    return { parsed: rawText, rawText, contentType, jsonParseFailed: true };
  }
}

export async function getJson<T>(
  url: string,
  opts?: { requestKey?: ApiRequestKey; init?: RequestInit }
): Promise<T> {
  const init: RequestInit = {
    ...opts?.init,
    headers: {
      Accept: "application/json",
      ...(opts?.init?.headers ?? {})
    }
  };

  let resp: Response;
  try {
    resp = await fetch(url, init);
  } catch (cause) {
    throw new ApiError({
      status: 0,
      message: "Network error",
      url,
      method: init.method ?? "GET",
      requestKey: opts?.requestKey,
      detail: cause
    });
  }

  const { parsed, rawText, contentType, jsonParseFailed } = await readBody(resp);

  if (!resp.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in (parsed as any) ? (parsed as any).detail : parsed;
    throw new ApiError({
      status: resp.status,
      message: `${resp.status} ${resp.statusText}`,
      url,
      method: init.method ?? "GET",
      requestKey: opts?.requestKey,
      contentType,
      detail
    });
  }

  if (parsed === null) return parsed as T;
  if (jsonParseFailed) {
    throw new ApiError({
      status: resp.status,
      message: "Invalid JSON response from server",
      url,
      method: init.method ?? "GET",
      requestKey: opts?.requestKey,
      contentType,
      detail: { body: rawText.slice(0, 500) }
    });
  }

  return parsed as T;
}
