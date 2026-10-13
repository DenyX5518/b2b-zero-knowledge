import { io, type Socket } from "socket.io-client";

export type RealtimeState = "connecting" | "connected" | "disconnected" | "error";

export function connectRealtime(
  origin: string,
  accessToken: string,
  handlers: { onState?: (state: RealtimeState) => void; onMessage?: (message: Record<string, unknown>) => void } = {}
): Socket {
  handlers.onState?.("connecting");
  const socket = io(`${origin}/realtime`, { auth: { token: accessToken }, transports: ["websocket"], reconnection: true, reconnectionAttempts: 8 });
  socket.on("connect", () => handlers.onState?.("connected"));
  socket.on("disconnect", () => handlers.onState?.("disconnected"));
  socket.on("connect_error", () => handlers.onState?.("error"));
  socket.on("message:created", (message) => handlers.onMessage?.(message));
  return socket;
}
