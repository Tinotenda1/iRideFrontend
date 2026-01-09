/**
 * PASSENGER SOCKET SERVICE
 * ----------------------------------------------------
 * Clean, lightweight socket controller for passengers
 * Phone-based connection only (no location tracking)
 */

import { disconnectSocket, initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
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

/**
 * Network check (Expo-safe)
 */
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
    const s = socket;
    if (!s || !s.connected) return;

    try {
      s.emit("heartbeat:ping", Date.now());
    } catch (err) {
      console.warn("⚠️ Passenger heartbeat failed", err);
    }
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  heartbeatTimer && clearInterval(heartbeatTimer);
  heartbeatTimer = null;
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

  if (!phone) {
    console.warn("📵 Passenger phone missing");
    setStatus("error");
    return;
  }

  socket = initializeSocket();

  socket.on("connect", () => {
    socket?.emit("user:connect", {
      phone,
      userType: "passenger",
    });
  });

  socket.on("user:connected", () => {
    setStatus("connected");
    startHeartbeat();
  });

  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", () => handleDisconnect("connect_error"));
};

export const disconnectPassenger = () => {
  shouldStayOnline = false;

  clearTimers();

  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (err) {
      console.warn("⚠️ Passenger socket disconnect error", err);
    }
    socket = null;
  }

  disconnectSocket();
  setStatus("offline");
};

export const getPassengerSocketStatus = () => status;
export const isPassengerOnline = () => status === "connected";
