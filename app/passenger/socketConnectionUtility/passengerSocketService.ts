/**
 * PASSENGER SOCKET SERVICE – FINAL FIXED VERSION
 * ----------------------------------------------------
 * Lightweight, phone-based connection with optional location.
 * Heartbeat, reconnect, and ride request support included.
 */

import { disconnectSocket, initializeSocket } from "@/utils/sockets";
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
 * Internal State (Singleton)
 * ------------------------------------------- */
let socket: Socket | null = null;
let status: PassengerSocketStatus = "offline";
let shouldStayOnline = false;

/* Timers */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/* ---------------------------------------------
 * Config
 * ------------------------------------------- */
const HEARTBEAT_INTERVAL = 10000;
const RECONNECT_DELAY = 5000;

/* ---------------------------------------------
 * Helpers
 * ------------------------------------------- */
const setStatus = (s: PassengerSocketStatus) => {
  status = s;
  console.log("📡 Passenger socket status:", s);
};

const clearTimers = () => {
  heartbeatTimer && clearInterval(heartbeatTimer);
  reconnectTimer && clearTimeout(reconnectTimer);
  heartbeatTimer = null;
  reconnectTimer = null;
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true;
};

/* ---------------------------------------------
 * Heartbeat
 * ------------------------------------------- */
const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (!socket?.connected) return;
    socket.emit("user:ping"); // ✅ Backend-aligned
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  heartbeatTimer && clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

/* ---------------------------------------------
 * Location helper
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
 * Reconnection Logic
 * ------------------------------------------- */
const attemptReconnect = async () => {
  if (reconnectTimer || !shouldStayOnline) return;

  const online = await isNetworkOnline();
  if (!online) return;

  setStatus("reconnecting");

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectPassenger();
  }, RECONNECT_DELAY);
};

const handleDisconnect = (reason: string) => {
  console.warn("⚠️ Passenger socket disconnected:", reason);
  stopHeartbeat();
  if (!shouldStayOnline) {
    setStatus("offline");
    return;
  }
  attemptReconnect();
};

/* ---------------------------------------------
 * Public API
 * ------------------------------------------- */
export const connectPassenger = async () => {
  if (status === "connected" || status === "connecting") return;

  const online = await isNetworkOnline();
  if (!online) {
    console.warn("🚫 No network — cannot connect passenger");
    return;
  }

  shouldStayOnline = true;
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");
  const location = await getPassengerLocation();

  if (!phone) {
    console.warn("📵 Passenger phone missing");
    setStatus("error");
    return;
  }

  socket = initializeSocket();
  socket.removeAllListeners();

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

  socket.on("disconnect", () => handleDisconnect("disconnect"));
  socket.on("connect_error", () => handleDisconnect("connect_error"));

  socket.connect();
};

export const disconnectPassenger = () => {
  shouldStayOnline = false;
  clearTimers();

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  disconnectSocket();
  setStatus("offline");
};


/* ---------------------------------------------
 * Status helpers
 * ------------------------------------------- */
export const getPassengerSocketStatus = () => status;
export const isPassengerOnline = () => status === "connected";
export const getPassengerSocket = () => socket;