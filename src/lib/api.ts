/** Minimal client for our own JSON API: unwraps `{data}` and throws `ApiError` on `{error}`. */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly hint: string | undefined;
  readonly issues: { path: string; message: string }[] | undefined;
  constructor(
    status: number,
    body: { code?: string; message?: string; hint?: string; issues?: ApiError["issues"] },
  ) {
    super(body.message ?? "שגיאה לא צפויה");
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "INTERNAL_ERROR";
    this.hint = body.hint;
    this.issues = body.issues;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK",
      message: "אין חיבור לשרת. בדוק את הרשת ונסה שוב.",
    });
  }
  const text = await res.text();
  let json: { data?: T; error?: ConstructorParameters<typeof ApiError>[1] } = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(res.status, {
        code: "BAD_RESPONSE",
        message: "תשובה לא תקינה מהשרת",
      });
    }
  }
  if (!res.ok) throw new ApiError(res.status, json.error ?? { message: res.statusText });
  return json.data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};

export function toQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === false) continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
