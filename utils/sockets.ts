// utils/sockets.ts
import { io, Socket } from "socket.io-client";

// ------------------------------
// Socket instance
// ------------------------------
let socket: Socket | null = null;

// ------------------------------
// Server URL
// ------------------------------
// Replace with your LAN IP or ngrok URL when testing on device/emulator
const SERVER_URL =
  process.env.EXPO_BASE_URL || "http://10.106.89.227:5000"; // <-- update this

// ------------------------------
// Initialize socket connection
// ------------------------------
export const initializeSocket = (): Socket => {
  if (socket && socket.connected) {
    console.log("🌐 Reusing existing socket:", socket.id);
    return socket;
  }

  console.log("🌐 Creating new socket connection to", SERVER_URL);

  socket = io(SERVER_URL, {
    transports: ["websocket"], // force WebSocket only
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 5000,
  });

  // ------------------------------
  // Global socket logging
  // ------------------------------
  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`🔄 Socket reconnect attempt #${attempt}`);
  });

  socket.io.on("reconnect_failed", () => {
    console.error("❌ Socket reconnect failed");
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket connect_error:", err);
  });

  socket.on("connect", () => {
    console.log("🔗 Socket connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Socket disconnected:", reason);
  });

  return socket;
};

// ------------------------------
// Get current socket instance
// ------------------------------
export const getSocket = (): Socket | null => {
  return socket;
};

// ------------------------------
// Disconnect socket
// ------------------------------
export const disconnectSocket = (): void => {
  if (socket) {
    console.log("🛑 Disconnecting socket:", socket.id);
    socket.disconnect();
    socket = null;
  }
};
