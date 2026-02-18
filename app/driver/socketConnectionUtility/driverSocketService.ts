// app/driver/socketConnectionUtility/driverSocketService.ts
import { getSocket, initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Location from "expo-location";
import * as Network from "expo-network";
import * as TaskManager from "expo-task-manager";
import { Socket } from "socket.io-client";

const LOCATION_TRACKING_TASK = "background-location-tracking";

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
    } else {
      // ⚡ OPTIONAL: If disconnected, we could cache the location
      // and send it as a "batch" once reconnected.
      console.log("📡 Offline: Background location update skipped.");
    }
  }
});

export type DriverSocketStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

let socket: Socket | null = null;
let status: DriverSocketStatus = "offline";
let shouldStayOnline = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectListener: ((data: any) => void) | null = null;

const HEARTBEAT_INTERVAL = 10000;

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

const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit("user:ping");
    }
  }, HEARTBEAT_INTERVAL);
};

const startLocationUpdates = async () => {
  const { status: foreground } =
    await Location.requestForegroundPermissionsAsync();
  const { status: background } =
    await Location.requestBackgroundPermissionsAsync();

  if (foreground !== "granted" || background !== "granted") {
    console.warn("⚠️ Location permissions not fully granted");
    return;
  }

  const isStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TRACKING_TASK,
  );
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
    pausesUpdatesAutomatically: false,
  });
};

const stopLocationUpdates = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TRACKING_TASK,
  );
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
  }
};

export const connectDriver = async () => {
  const user = await getUserInfo();
  const phone = user?.phone;

  if (!phone) return setStatus("error");
  if (socket?.connected && status === "connected") return;

  shouldStayOnline = true;
  setStatus("connecting");

  socket = initializeSocket(phone); // CLEANUP existing listeners to prevent memory leaks/duplicate events

  socket.off("connect");
  socket.off("user:connected");
  socket.off("disconnect"); // ⚡ AUTO-HANDSHAKE: This fires on initial connect AND auto-reconnects

  socket.on("connect", async () => {
    console.log("🔌 Connection established, handshaking..."); // Get fresh location for the handshake

    const { status: locStatus } =
      await Location.getForegroundPermissionsAsync();
    let location = null;
    if (locStatus === "granted") {
      const last = await Location.getLastKnownPositionAsync();
      if (last)
        location = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
    }

    socket?.emit("user:connect", {
      phone: phone.replace(/\D/g, ""),
      userType: "driver",
      location,
    });
  });

  socket.on("user:connected", () => {
    setStatus("connected");
    startHeartbeat();
    startLocationUpdates(); // Turn on background tracking
  });

  // Listen for backend session restore push
  socket.on("user:reconnect_state", (data) => {
    console.log("🔁 Reconnect state received:", data);

    if (reconnectListener) {
      reconnectListener(data);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Disconnected:", reason);
    if (reason === "io client disconnect" || !shouldStayOnline) {
      clearTimers();
      stopLocationUpdates();
      setStatus("offline");
    } else {
      // "transport close" or "ping timeout" triggers reconnecting state
      setStatus("reconnecting");
    }
  });

  if (!socket.connected) socket.connect();
};

export const disconnectDriver = () => {
  shouldStayOnline = false;
  clearTimers();
  stopLocationUpdates();
  if (socket) socket.disconnect();
  setStatus("offline");
};

export const handleDriverResponse = (
  rideId: string,
  driverPhone: string,
  currentOffer: number,
  responseType: "accept" | "counter",
) => {
  if (!socket?.connected) return;
  socket.emit("driver:respond_to_ride", {
    rideId,
    driverPhone,
    currentOffer,
    responseType,
  });
};

export const onNewRideRequest = (callback: (ride: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride:new_request";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onMatchedRide = (callback: (ride: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride:matched";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onDriverRejected = (callback: (ride: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride:offer_rejected";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onRideCancelled = (callback: (data: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride_cancelled";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onRemoveRideRequest = (callback: (data: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride:remove_request";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onRideNoLongerAvailable = (
  callback: (data: { rideId: string }) => void,
) => {
  if (!socket) return () => {};
  const eventName = "ride:no_longer_available";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

export const onRideCompletedByPassenger = (callback: (data: any) => void) => {
  if (!socket) return () => {};
  const eventName = "ride:completed";
  socket.on(eventName, callback);
  return () => {
    socket?.off(eventName, callback);
  };
};

// Listen for backend reconnect sync
export const onReconnectState = (callback: (data: any) => void) => {
  if (!socket) return () => {};
  reconnectListener = callback;
  socket.on("user:reconnect_state", reconnectListener);
  return () => {
    if (reconnectListener) {
      socket?.off("user:reconnect_state", reconnectListener);
      reconnectListener = null;
    }
  };
};

export const getDriverSocketStatus = () => status;
export const isDriverOnline = () => status === "connected";
export const getDriverSocket = () => socket;
