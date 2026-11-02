export type BackendSession = { accessToken: string; refreshToken: string; expiresIn: number };

export type EncryptedMessage = {
  id: string;
  roomId: string;
  senderId: string;
  clientMessageId: string;
  ciphertext: string;
  nonce: string;
  aad: string;
  keyEpoch: number;
  createdAt: string;
};

// status = 0 — сеть недоступна; иначе HTTP-код ответа backend.
export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function apiRequest<T>(origin: string, path: string, options: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(`${origin}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
    const body = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = (body as { message?: string | string[] } | null)?.message;
      throw new ApiError(Array.isArray(message) ? message.join("; ") : message || `HTTP ${response.status}`, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new ApiError(`Нет ответа от ${origin}`, 0);
    throw new ApiError(`Backend ${origin} недоступен`, 0);
  } finally {
    clearTimeout(timer);
  }
}
