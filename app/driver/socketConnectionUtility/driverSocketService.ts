/**
 * DRIVER SOCKET SERVICE - DEBUGGED
 */

import { disconnectSocket, initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Network from "expo-network";
import { Socket } from "socket.io-client";
import { getDriverLocation } from "../driverLocationUtility/driverLocation";

/* ---------------------------------------------
 * Types
 * ------------------------------------------- */
export type DriverSocketStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

/* ---------------------------------------------
 * Internal State
 * ------------------------------------------- */
let socket: Socket | null = null;
let status: DriverSocketStatus = "offline";
let shouldStayOnline = false;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let locationTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/* ---------------------------------------------
 * Config
 * ------------------------------------------- */
const LOCATION_INTERVAL = 3000;
const HEARTBEAT_INTERVAL = 10000;
const RECONNECT_DELAY = 5000;

/* ---------------------------------------------
 * Helpers
 * ------------------------------------------- */
const setStatus = (s: DriverSocketStatus) => {
  status = s;
  console.log("📡 Driver socket status:", s);
};

const clearTimers = () => {
  heartbeatTimer && clearInterval(heartbeatTimer);
  locationTimer && clearInterval(locationTimer);
  reconnectTimer && clearTimeout(reconnectTimer);

  heartbeatTimer = null;
  locationTimer = null;
  reconnectTimer = null;
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  console.log("🌐 Network state:", state);
  return state.isConnected === true;
};

/* ---------------------------------------------
 * Heartbeat
 * ------------------------------------------- */
const startHeartbeat = () => {
  stopHeartbeat();
  console.log("💓 Starting heartbeat...");
  heartbeatTimer = setInterval(() => {
    if (!socket || !socket.connected) {
      console.warn("⚠️ Heartbeat skipped - socket not connected");
      return;
    }
    try {
      console.log("💓 Sending heartbeat ping");
      socket.emit("heartbeat:ping", Date.now());
    } catch (err) {
      console.warn("⚠️ Heartbeat emit failed", err);
    }
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  heartbeatTimer && clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

/* ---------------------------------------------
 * Location Updates
 * ------------------------------------------- */
const startLocationUpdates = () => {
  stopLocationUpdates();
  console.log("📍 Starting location updates...");
  locationTimer = setInterval(async () => {
    if (!socket || !socket.connected) {
      console.warn("⚠️ Location update skipped - socket not connected");
      return;
    }

    const result = await getDriverLocation();
    if (!result.success) {
      console.warn(`📍 Location fetch failed: ${result.error} - ${result.message}`);
      return;
    }

    const loc = result.location;
    console.log(`📍 Location update: ${loc.latitude}, ${loc.longitude}`);

    try {
      socket.emit("driver:location_update", {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        heading: loc.heading,
        speed: loc.speed,
        timestamp: loc.timestamp,
      });
    } catch (err) {
      console.warn("⚠️ Location emit failed", err);
    }
  }, LOCATION_INTERVAL);
};

const stopLocationUpdates = () => {
  locationTimer && clearInterval(locationTimer);
  locationTimer = null;
};

/* ---------------------------------------------
 * Reconnection
 * ------------------------------------------- */
const attemptReconnect = async () => {
  if (reconnectTimer || !shouldStayOnline) return;
  console.log("🔄 Attempting reconnect...");

  const online = await isNetworkOnline();
  if (!online) {
    console.warn("🚫 Cannot reconnect - no network");
    return;
  }

  setStatus("reconnecting");

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log("🔄 Reconnecting now...");
    connectDriver();
  }, RECONNECT_DELAY);
};

const handleDisconnect = (reason: string) => {
  console.warn("⚠️ Driver socket disconnected:", reason);

  stopHeartbeat();
  stopLocationUpdates();

  if (!shouldStayOnline) {
    setStatus("offline");
    return;
  }

  attemptReconnect();
};

/* ---------------------------------------------
 * Public API
 * ------------------------------------------- */
export const connectDriver = async () => {
  console.log("🚀 connectDriver called");

  if (status === "connected" || status === "connecting") {
    console.log("⚠️ Already connected or connecting, skipping...");
    return;
  }

  const online = await isNetworkOnline();
  if (!online) {
    console.warn("🚫 No network — cannot connect");
    setStatus("error");
    return;
  }

  shouldStayOnline = true;
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");
  console.log("📱 User phone:", phone);

  const locationResult = await getDriverLocation();
  if (!phone || !locationResult.success) {
    console.warn(`📍 Initial location failed: ${locationResult.success ? 'No phone' : locationResult.error}`);
    setStatus("error");
    return;
  }

  const location = locationResult.location;
  console.log(`📍 Initial location: ${location.latitude}, ${location.longitude}`);

  socket = initializeSocket();

  socket.on("connect", () => {
    console.log("🔗 Socket connected, emitting user:connect...");
    socket?.emit("user:connect", {
      phone,
      userType: "driver",
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
      },
    });
  });

  socket.on("user:connected", (data) => {
    console.log("✅ user:connected received:", data);
    setStatus("connected");
    startHeartbeat();
    startLocationUpdates();
  });

  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", (err) => {
    console.error("❌ connect_error:", err);
    handleDisconnect("connect_error");
  });
};

/**
 * Return the current active driver socket instance
 * @returns {Socket | null} - connected socket or null
 */
export const getDriverSocket = (): Socket | null => {
  if (socket && socket.connected) {
    return socket;
  }
  console.warn("⚠️ getDriverSocket: No active socket or socket not connected");
  return null;
};

/* ------------------------------------------- 
* Disconnect driver socket
* --------------------------------------------- */
export const disconnectDriver = () => {
  console.log("🛑 disconnectDriver called");
  shouldStayOnline = false;
  clearTimers();

  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (err) {
      console.warn("⚠️ Socket disconnect error", err);
    }
    socket = null;
  }

  disconnectSocket();
  setStatus("offline");
};

export const getDriverSocketStatus = () => status;
export const isDriverOnline = () => status === "connected";
