// app/passenger/socketConnectionUtility/passengerSocketService.ts

import { initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { Socket } from "socket.io-client";

/* ----------------------------------------
   TYPES
---------------------------------------- */

export type PassengerSocketStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface CancelPayload {
  rideId: string;
  cancelledBy: "driver" | "system";
  reason: string;
}

/* ----------------------------------------
   STATE
---------------------------------------- */

let socket: Socket | null = null;
let isConnecting = false;

let status: PassengerSocketStatus = "offline";
let shouldStayOnline = false;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

/* External listeners */
let reconnectListener: ((data: any) => void) | null = null;
let onCancelCallback: ((data: CancelPayload) => void) | null = null;

const HEARTBEAT_INTERVAL = 10000;

/* ----------------------------------------
   HELPERS
---------------------------------------- */

const setStatus = (s: PassengerSocketStatus) => {
  status = s;
  console.log("📡 Passenger socket status:", s);
};

const clearTimers = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const isNetworkOnline = async () => {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true;
};

const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit("user:ping");
    }
  }, HEARTBEAT_INTERVAL);
};

/* ----------------------------------------
   LOCATION
---------------------------------------- */

const getPassengerLocation = async () => {
  try {
    const { status: permissionStatus } =
      await Location.getForegroundPermissionsAsync();

    if (permissionStatus !== "granted") return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (error) {
    console.warn("⚠️ Passenger location unavailable:", error);
    return null;
  }
};

/* ----------------------------------------
   CONNECTION
---------------------------------------- */

export const connectPassenger = async () => {
  console.log("🔄 connectPassenger() function initiated"); // NEW LOG

  const user = await getUserInfo();
  const rawPhone = user?.phone;

  if (!rawPhone) {
    console.error("❌ Cannot connect: No phone number");
    setStatus("error");
    return;
  }

  const phone = rawPhone.replace(/\D/g, "");

  if (isConnecting || status === "connecting") return;

  isConnecting = true;
  shouldStayOnline = true;
  setStatus("connecting");

  /* Init socket */
  if (!socket) {
    socket = initializeSocket(phone);
  } else {
    socket.auth = { phone };
  }

  if (!socket) {
    console.error("❌ Socket initialization failed");
    return;
  }

  /* Clear old listeners */
  socket.removeAllListeners();

  /* ------------------------
     CONNECT
  ------------------------ */

  socket.on("connect", async () => {
    console.log("🔌 Passenger socket connected");

    const location = await getPassengerLocation();

    socket?.emit("user:connect", {
      phone,
      userType: "passenger",
      ...(location && { location }),
    });
  });

  /* ------------------------
     CONNECTED ACK
  ------------------------ */

  socket.on("user:connected", () => {
    isConnecting = false;

    setStatus("connected");

    startHeartbeat();

    console.log("♻️ Passenger connected. Ready for restore.");

    /* Rebind reconnect listener */
    if (reconnectListener && socket) {
      socket.off("user:reconnect_state", reconnectListener);
      socket.on("user:reconnect_state", reconnectListener);
    }
  });

  /* ------------------------
     RECONNECT STATE
  ------------------------ */

  socket.on("user:reconnect_state", (data) => {
    if (reconnectListener) {
      reconnectListener(data);
    }
  });

  /* ------------------------
     DISCONNECT
  ------------------------ */

  socket.on("disconnect", async (reason) => {
    isConnecting = false;
    console.log("❌ Passenger socket disconnected:", reason);

    clearTimers();

    if (!shouldStayOnline || reason === "io client disconnect") {
      setStatus("offline");
      return;
    }

    setStatus("reconnecting");

    const online = await isNetworkOnline();

    if (online) {
      setTimeout(() => {
        if (shouldStayOnline && status !== "connected") {
          connectPassenger();
        }
      }, 3000);
    }
  });

  /* ------------------------
     ERRORS
  ------------------------ */

  socket.on("connect_error", (err) => {
    isConnecting = false;
    console.error("❌ Socket error:", err.message);

    setStatus("error");

    if (shouldStayOnline) {
      setTimeout(() => {
        if (shouldStayOnline && status !== "connected") {
          connectPassenger();
        }
      }, 5000);
    }
  });

  /* ------------------------
     ACTIVATE
  ------------------------ */

  if (!socket.connected) {
    socket.connect();
  }
};

/* ----------------------------------------
   DISCONNECT
---------------------------------------- */

export const disconnectPassenger = () => {
  console.log("🔌 Disconnecting passenger...");

  shouldStayOnline = false;

  clearTimers();

  reconnectListener = null;
  onCancelCallback = null;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = null;

  setStatus("offline");
};

/* ----------------------------------------
   SUBSCRIPTIONS
---------------------------------------- */

export const subscribeToRideCancellation = (
  callback: (data: CancelPayload) => void,
) => {
  onCancelCallback = callback;
};

/* ----------------------------------------
   RECONNECT STATE LISTENER
---------------------------------------- */

export const onReconnectState = (callback: (data: any) => void) => {
  reconnectListener = callback;

  if (socket) {
    socket.off("user:reconnect_state");
    socket.on("user:reconnect_state", callback);
  }

  /* Unsubscribe */
  return () => {
    if (socket && reconnectListener) {
      socket.off("user:reconnect_state", reconnectListener);
    }

    reconnectListener = null;
  };
};

/* ----------------------------------------
   GETTERS
---------------------------------------- */

export const getPassengerSocketStatus = () => status;

export const isPassengerOnline = () => status === "connected";

export const getPassengerSocket = () => socket;
