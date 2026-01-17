import { initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { Socket } from "socket.io-client";

/* ---------------------------------------------
 * Types
 * ------------------------------------------- */
export type PassengerSocketStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/* ---------------------------------------------
 * Internal State (Singleton Instance)
 * ------------------------------------------- */
let socket: Socket | null = null;
let status: PassengerSocketStatus = "offline";
let shouldStayOnline = false;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_INTERVAL = 10000;

/* ---------------------------------------------
 * Helpers
 * ------------------------------------------- */
const setStatus = (s: PassengerSocketStatus) => {
  status = s;
  console.log("📡 Passenger socket status:", s);
};

const clearTimers = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true;
};

/* ---------------------------------------------
 * Heartbeat
 * ------------------------------------------- */
const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit("user:ping");
    }
  }, HEARTBEAT_INTERVAL);
};

/* ---------------------------------------------
 * Location helper (Foreground Only)
 * ------------------------------------------- */
const getPassengerLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
};

/* ---------------------------------------------
 * Public API
 * ------------------------------------------- */
export const connectPassenger = async () => {
  socket = initializeSocket();

  // If already connected and authenticated, skip
  if (socket.connected && status === "connected") return;

  const online = await isNetworkOnline();
  if (!online) {
    setStatus("error");
    return;
  }

  shouldStayOnline = true;
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");
  const location = await getPassengerLocation();

  if (!phone) {
    setStatus("error");
    return;
  }

  /* ---------------------------------------------
   * Register listeners (CLEAN SLATE via .off)
   * ------------------------------------------- */
  socket.off("connect");
  socket.off("user:connected");
  socket.off("disconnect");
  socket.off("connect_error");

  socket.on("connect", () => {
    socket?.emit("user:connect", {
      phone,
      userType: "passenger",
      ...(location && { location }),
    });
  });

  socket.on("user:connected", () => {
    setStatus("connected");
    startHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io client disconnect" || !shouldStayOnline) {
      clearTimers();
      setStatus("offline");
    } else {
      // Internal Socket.io reconnection is happening
      setStatus("reconnecting");
    }
  });

  socket.on("connect_error", () => {
    setStatus("error");
  });

  // Trigger connection
  if (!socket.connected) {
    socket.connect();
  } else {
    // If socket was already physically connected, just re-authenticate
    socket.emit("user:connect", {
      phone,
      userType: "passenger",
      ...(location && { location }),
    });
  }
};

export const disconnectPassenger = () => {
  shouldStayOnline = false;
  clearTimers();

  if (socket) {
    socket.disconnect(); // Soft disconnect (instance remains)
  }

  setStatus("offline");
};

/* ---------------------------------------------
 * Status helpers
 * ------------------------------------------- */
export const getPassengerSocketStatus = () => status;
export const isPassengerOnline = () => status === "connected";
export const getPassengerSocket = () => socket;