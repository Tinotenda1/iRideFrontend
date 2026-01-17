import { getSocket, initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Location from 'expo-location';
import * as Network from "expo-network";
import * as TaskManager from 'expo-task-manager';
import { Socket } from "socket.io-client";

/* ---------------------------------------------
 * Background Task Definition
 * ------------------------------------------- */
const LOCATION_TRACKING_TASK = 'background-location-tracking';

TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("❌ Background Location Task Error:", error);
    return;
  }
  if (data) {
    const { locations } = data;
    const loc = locations[0];
    const socketInstance = getSocket();

    if (socketInstance?.connected) {
      socketInstance.emit("driver:location_update", {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        heading: loc.coords.heading,
        speed: loc.coords.speed,
        timestamp: loc.timestamp,
      });
    }
  }
});

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
let shouldStayOnline = false; // Now used in disconnect logic

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

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
  heartbeatTimer = null;
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true;
};

/* ---------------------------------------------
 * Heartbeat & Location Emitters
 * ------------------------------------------- */
const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit("user:ping");
    }
  }, HEARTBEAT_INTERVAL);
};

const startLocationUpdates = async () => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  const { status: background } = await Location.requestBackgroundPermissionsAsync();

  if (foreground !== 'granted' || background !== 'granted') {
    console.warn("⚠️ Location permissions not fully granted");
    return;
  }

  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  if (isStarted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 3000,
    distanceInterval: 5,
    foregroundService: {
      notificationTitle: "UnHaggled Online",
      notificationBody: "Your location is being shared with passengers.",
      notificationColor: "#00FF00",
    },
    // FIX: Correct property name for TypeScript
    pausesUpdatesAutomatically: false, 
  });
};

const stopLocationUpdates = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  }
};

/* ---------------------------------------------
 * Connect Driver
 * ------------------------------------------- */
export const connectDriver = async () => {
  socket = initializeSocket();

  if (socket.connected && status === "connected") return;

  const online = await isNetworkOnline();
  if (!online) {
    setStatus("error");
    return;
  }

  shouldStayOnline = true; // Mark that the driver intends to be online
  setStatus("connecting");

  const user = await getUserInfo();
  const phone = user?.phone?.replace(/\D/g, "");

  if (!phone) {
    setStatus("error");
    return;
  }

  const currentLoc = await Location.getCurrentPositionAsync({});

  socket.off("connect");
  socket.off("user:connected");
  socket.off("disconnect");
  socket.off("connect_error");

  socket.on("connect", () => {
    socket?.emit("user:connect", {
      phone,
      userType: "driver",
      location: { 
        latitude: currentLoc.coords.latitude, 
        longitude: currentLoc.coords.longitude 
      },
    });
  });

  socket.on("user:connected", () => {
    setStatus("connected");
    startHeartbeat();
    startLocationUpdates();
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io client disconnect" || !shouldStayOnline) {
      clearTimers();
      stopLocationUpdates();
      setStatus("offline");
    } else {
      setStatus("reconnecting");
    }
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Driver connect error:", err.message);
    setStatus("error");
  });

  if (!socket.connected) {
    socket.connect();
  } else {
    socket.emit("user:connect", {
      phone,
      userType: "driver",
      location: { 
        latitude: currentLoc.coords.latitude, 
        longitude: currentLoc.coords.longitude 
      },
    });
  }
};

/* ---------------------------------------------
 * Disconnect Driver
 * ------------------------------------------- */
export const disconnectDriver = () => {
  shouldStayOnline = false; // Ensures disconnect logic knows this is intentional
  clearTimers();
  stopLocationUpdates();

  if (socket) {
    socket.disconnect();
  }

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
  if (!socket?.connected) return;

  socket.emit("driver:respond_to_ride", {
    rideId,
    driverId,
    currentOffer,
    responseType,
  });
};

export const getDriverSocketStatus = () => status;
export const isDriverOnline = () => status === "connected";
export const getDriverSocket = () => socket;