const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? "";
const DEFAULT_TIMEOUT_MS = 30_000;

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...rest } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Merge external signal with timeout signal
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort());
  }

  const url = `${BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...rest.headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      throw new ApiError(0, null, `Request timed out after ${timeoutMs}ms`);
    }
    throw new ApiError(0, null, `Network error: ${(err as Error).message}`);
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      response.status,
      body,
      `HTTP ${response.status} from ${path}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── NDJSON fetcher (for future agg=raw queries in Phase 4) ─────────────────

export async function apiFetchNdjson(
  path: string,
  signal?: AbortSignal
): Promise<ReadableStream<string>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/x-ndjson" },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new ApiError(response.status, null, `HTTP ${response.status}`);
  }
  // Return a stream of decoded text lines (consumer handles parsing)
  const reader = response.body.pipeThrough(new TextDecoderStream());
  return reader;
}
