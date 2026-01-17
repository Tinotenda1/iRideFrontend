import { io, Socket } from "socket.io-client";

/* ---------------------------------------------
 * Socket Singleton
 * ------------------------------------------- */
let socket: Socket | null = null;

const SERVER_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "https://unhaggled-aja-intercolonial.ngrok-free.dev";

/* ---------------------------------------------
 * Initialize socket (Reuse instance)
 * ------------------------------------------- */
export const initializeSocket = (): Socket => {
  if (socket) {
    return socket;
  }

  console.log("🌐 Creating persistent socket instance to", SERVER_URL);

  socket = io(SERVER_URL, {
    path: "/socket.io",
    // Prioritize websocket for better background stability
    transports: ["websocket", "polling"], 
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
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
    console.error("❌ Socket connect_error:", err.message);
  });

  return socket;
};

/* ---------------------------------------------
 * Get socket instance
 * ------------------------------------------- */
export const getSocket = (): Socket | null => socket;

/* ---------------------------------------------
 * Disconnect socket (Soft disconnect)
 * ------------------------------------------- */
export const disconnectSocket = (): void => {
  if (socket) {
    console.log("🛑 Soft-disconnecting socket:", socket.id);
    socket.disconnect();
    // Note: We do NOT set socket = null to keep the instance for reuse
  }
};