/**
 * Persistent WebSocket connection pool.
 *
 * One connection is kept open per backend URL and shared across all RPC calls.
 * Multiple in-flight requests are multiplexed via JSON-RPC id fields.
 * The connection is created lazily on the first call and re-established
 * automatically if it drops (pending requests are rejected so callers can retry).
 */

interface RpcErrorShape {
  message?: unknown;
  data?: unknown;
}

interface WsRpcMessage {
  id?: unknown;
  result?: unknown;
  error?: unknown;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  method: string;
}

const formatRpcError = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const e = error as RpcErrorShape;
  const parts = [e.message, e.data].filter(Boolean).map(String);
  if (parts.length) return parts.join(" | ");
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
};

class WsConnection {
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private pending = new Map<number, PendingRequest>();
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async call<T>(method: string, params: unknown, timeoutMs = 8000): Promise<T> {
    await this.ensureConnected();
    return new Promise<T>((resolve, reject) => {
      const id = Date.now() + Math.floor(Math.random() * 10000);
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} request timeout`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timeout,
        method,
      });
      this.ws!.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  private ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.connectPromise = null;
        resolve();
      };

      ws.onerror = () => {
        this.connectPromise = null;
        this.ws = null;
        reject(new Error(`WebSocket connection error: ${this.url}`));
      };

      ws.onclose = () => {
        this.connectPromise = null;
        this.ws = null;
        // Reject all in-flight requests so they don't hang until timeout
        for (const [id, req] of this.pending) {
          clearTimeout(req.timeout);
          req.reject(new Error(`${req.method} connection closed`));
          this.pending.delete(id);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        let msg: WsRpcMessage;
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        const id = msg?.id as number;
        const req = this.pending.get(id);
        if (!req) return;

        clearTimeout(req.timeout);
        this.pending.delete(id);

        if (msg.error) {
          req.reject(
            new Error(formatRpcError(msg.error) || `${req.method} rpc error`),
          );
          return;
        }

        // Handle result-wrapped error
        if (
          msg.result &&
          typeof msg.result === "object" &&
          !Array.isArray(msg.result) &&
          "error_message" in msg.result
        ) {
          req.reject(
            new Error(
              String(
                (msg.result as { error_message?: unknown }).error_message ||
                  `${req.method} rpc error`,
              ),
            ),
          );
          return;
        }

        req.resolve(msg.result);
      };
    });

    return this.connectPromise;
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}

// Module-level pool: one connection per backend URL
const pool = new Map<string, WsConnection>();

export function getWsConnection(url: string): WsConnection {
  if (!pool.has(url)) {
    pool.set(url, new WsConnection(url));
  }
  return pool.get(url)!;
}

export function releaseWsConnection(url: string) {
  const conn = pool.get(url);
  if (conn) {
    conn.close();
    pool.delete(url);
  }
}
