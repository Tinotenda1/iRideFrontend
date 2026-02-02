// utils/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
const SERVER_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://your-url.dev";

export const initializeSocket = (phone: string): Socket => {
  if (!socket) {
    socket = io(SERVER_URL, {
      path: "/socket.io",
      transports: ["websocket"], // Stick to websocket for stability if possible
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000, // Max 10s between retries
      auth: { phone: phone.replace(/\D/g, "") },
    });

    socket.on("connect", () => {
      console.log("🔗 Socket Transport Connected:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket Error:", err.message);
    });
  } else {
    // Update phone if it changed
    socket.auth = { phone: phone.replace(/\D/g, "") };
  }

  return socket;
};

export const getSocket = () => socket;
