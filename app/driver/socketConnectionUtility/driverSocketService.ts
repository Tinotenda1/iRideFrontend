/**
 * DRIVER SOCKET SERVICE
 * ----------------------------------------------------
 * Clean, reliable, global socket controller for drivers
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
 * Internal State (Singleton)
 * ------------------------------------------- */
let socket: Socket | null = null;
let status: DriverSocketStatus = "offline";
let shouldStayOnline = false;

/* Timers (RN-safe types) */
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

/**
 * Check network connectivity (Expo-safe)
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
    const s = socket; // snapshot reference
    if (!s || !s.connected) return;

    try {
        s.emit("heartbeat:ping", Date.now());
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

  locationTimer = setInterval(async () => {
    const s = socket;
    if (!s || !s.connected) return;

    const result = await getDriverLocation();
    
    // Handle the new LocationResult type
    if (!result.success) {
      console.warn(`📍 Location fetch failed: ${result.error} - ${result.message}`);
      return;
    }

    const loc = result.location;

    // Log every location update
    console.log(`📍 Location update: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (acc: ${loc.accuracy}m)`);

    try {
      s.emit("driver:location-update", {
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
 * Reconnection Logic
 * ------------------------------------------- */

const attemptReconnect = async () => {
  if (reconnectTimer || !shouldStayOnline) return;

  const online = await isNetworkOnline();
  if (!online) return;

  setStatus("reconnecting");

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
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
  if (status === "connected" || status === "connecting") return;

  const online = await isNetworkOnline();
  if (!online) {
    console.warn("🚫 No network — cannot connect");
    return;
  }

  shouldStayOnline = true;
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");
  
  // Get location with new result handling
  const locationResult = await getDriverLocation();
  
  if (!phone || !locationResult.success) {
    console.warn(`📍 Initial location failed: ${locationResult.success ? 'No phone' : locationResult.error}`);
    setStatus("error");
    return;
  }

  const location = locationResult.location;
  console.log(`📍 Initial location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);

  socket = initializeSocket();

  socket.on("connect", () => {
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

  socket.on("user:connected", () => {
    setStatus("connected");
    startHeartbeat();
    startLocationUpdates();
  });

  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", () => handleDisconnect("connect_error"));
};


export const disconnectDriver = () => {
  shouldStayOnline = false;

  // Stop timers FIRST
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
