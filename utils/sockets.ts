// utils/sockets.ts
import { io, Socket } from "socket.io-client";

/* ---------------------------------------------
 * Socket Singleton
 * ------------------------------------------- */
let socket: Socket | null = null;

/* ---------------------------------------------
 * Server URL
 * ------------------------------------------- */
const SERVER_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://unhaggled-aja-intercolonial.ngrok-free.dev";

/* ---------------------------------------------
 * Initialize socket (NO autoConnect)
 * ------------------------------------------- */
export const initializeSocket = (): Socket => {
  if (socket) {
    console.log("🌐 Reusing existing socket:", socket.id);
    return socket;
  }

  console.log("🌐 Creating new socket connection to", SERVER_URL);

  socket = io(SERVER_URL, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    autoConnect: false, // 🚨 CRITICAL FIX
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    timeout: 60000,
  });

  /* ---------------------------------------------
   * Global socket logging
   * ------------------------------------------- */
  socket.on("connect", () => {
    console.log("🔗 Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connect_error:", err);
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`🔄 Socket reconnect attempt #${attempt}`);
  });

  socket.io.on("reconnect_failed", () => {
    console.error("❌ Socket reconnect failed");
  });

  return socket;
};

/* ---------------------------------------------
 * Get socket instance
 * ------------------------------------------- */
export const getSocket = (): Socket | null => socket;

/* ---------------------------------------------
 * Disconnect socket completely
 * ------------------------------------------- */
export const disconnectSocket = (): void => {
  if (socket) {
    console.log("🛑 Disconnecting socket:", socket.id);
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
