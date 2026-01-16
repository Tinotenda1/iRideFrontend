/**
 * DRIVER SOCKET SERVICE – BACKEND ALIGNED & HARDENED
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

/* ---------------------------------------------
 * Config
 * ------------------------------------------- */
const LOCATION_INTERVAL = 3000;
const HEARTBEAT_INTERVAL = 10000;

/* ---------------------------------------------
 * Helpers
 * ------------------------------------------- */
const setStatus = (s: DriverSocketStatus) => {
  status = s;
  console.log("📡 Driver socket status:", s);
};

const clearTimers = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (locationTimer) clearInterval(locationTimer);
  heartbeatTimer = null;
  locationTimer = null;
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true;
};

/* ---------------------------------------------
 * Heartbeat (MATCHES BACKEND)
 * ------------------------------------------- */
const startHeartbeat = () => {
  stopHeartbeat();

  heartbeatTimer = setInterval(() => {
    if (!socket?.connected) return;
    socket.emit("user:ping");
  }, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

/* ---------------------------------------------
 * Location Updates (BACKEND MATCH)
 * ------------------------------------------- */
const startLocationUpdates = () => {
  stopLocationUpdates();

  locationTimer = setInterval(async () => {
    const s = socket; // capture current socket
    if (!s || !s.connected) {
      console.warn("⚠️ Location update skipped - socket not connected");
      return;
    }

    const result = await getDriverLocation();
    if (!result.success) return;

    const loc = result.location;

    try {
      s.emit("driver:location_update", {
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
   //console.log("📍 Driver location sent:", loc.latitude, loc.longitude, loc.speed, loc.heading, loc.accuracy);
  }, LOCATION_INTERVAL);
};


const stopLocationUpdates = () => {
  if (locationTimer) clearInterval(locationTimer);
  locationTimer = null;
};

/* ---------------------------------------------
 * Connect Driver (RACE SAFE)
 * ------------------------------------------- */
export const connectDriver = async () => {
  if (status === "connected" || status === "connecting") return;

  const online = await isNetworkOnline();
  if (!online) {
    setStatus("error");
    return;
  }

  socket = initializeSocket();
  shouldStayOnline = true;
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");

  const locationResult = await getDriverLocation();
  if (!phone || !locationResult.success) {
    setStatus("error");
    return;
  }

  const { latitude, longitude } = locationResult.location;

  /* ---------------------------------------------
   * Register listeners BEFORE connect
   * ------------------------------------------- */
  socket.removeAllListeners();

  socket.on("connect", () => {
    console.log("🔗 Connected → user:connect");

    socket?.emit("user:connect", {
      phone,
      userType: "driver",
      location: { latitude, longitude },
    });
  });

  socket.on("user:connected", () => {
    console.log("✅ Driver authenticated");
    setStatus("connected");
    startHeartbeat();
    startLocationUpdates();
  });

  socket.on("disconnect", () => {
    stopHeartbeat();
    stopLocationUpdates();

    if (shouldStayOnline) {
      setStatus("reconnecting");
      socket?.connect();
    } else {
      setStatus("offline");
    }
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Socket error:", err.message);
    setStatus("error");
  });

  socket.connect();
};

/* ---------------------------------------------
 * Disconnect Driver
 * ------------------------------------------- */
export const disconnectDriver = () => {
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
 * Driver Ride Response
 * ------------------------------------------- */
export const handleDriverResponse = (
  rideId: string,
  driverId: string,
  currentOffer: number,
  responseType: "accept" | "counter"
) => {
  if (!socket || !socket.connected) return;

  socket.emit("driver:respond_to_ride", {
    rideId,
    driverId,
    currentOffer,
    responseType,
  });
};


/* ---------------------------------------------
 * Status helpers
 * ------------------------------------------- */
export const getDriverSocketStatus = () => status;
export const isDriverOnline = () => status === "connected";
export const getDriverSocket = () => socket;