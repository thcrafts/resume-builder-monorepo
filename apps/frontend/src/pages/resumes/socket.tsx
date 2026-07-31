import { io, type Socket } from "socket.io-client";

// Default to same origin so Vite can proxy /socket.io to Nest on :3001.
// Direct localhost:3001 is unreliable on Windows when Cursor binds 127.0.0.1:3001.
const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

export const socket: Socket = io(socketUrl, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: true,
});
