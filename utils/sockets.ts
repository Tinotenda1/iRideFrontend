// utils/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const SERVER_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://your-ngrok-url.dev";

export const initializeSocket = (phone?: string): Socket => {
  if (!socket) {
    socket = io(SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false, // Keep this false so we can set phone first
      reconnection: true,
      auth: { phone: phone || "" }
    });
    
    // Global Logs
    socket.on("connect", () => console.log("🔗 Connected:", socket?.id));
    socket.on("connect_error", (err) => console.error("❌ Socket Error:", err.message));
  } else if (phone) {
    // If socket exists but needs a phone update
    socket.auth = { phone };
  }
  
  return socket;
};

// HELPER: Use this when the app starts or user logs in
export const connectWithPhone = (phone: string) => {
  const s = initializeSocket(phone);
  s.auth = { phone }; // Ensure phone is set
  s.connect();
};

export const getSocket = () => socket;