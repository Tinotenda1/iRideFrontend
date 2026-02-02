// app/passenger/socketConnectionUtility/passengerSocketService.ts
import { initializeSocket } from "@/utils/sockets";
import { getUserInfo } from "@/utils/storage";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { Socket } from "socket.io-client";

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

let socket: Socket | null = null;
let status: PassengerSocketStatus = "offline";
let shouldStayOnline = false;
let isConnecting = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let onCancelCallback: ((data: CancelPayload) => void) | null = null;

const HEARTBEAT_INTERVAL = 10000;

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

const startHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (socket?.connected) {
      socket.emit("user:ping");
    }
  }, HEARTBEAT_INTERVAL);
};

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

export const subscribeToRideCancellation = (
  callback: (data: CancelPayload) => void,
) => {
  onCancelCallback = callback;
};

export const connectPassenger = async () => {
  // Prevent double-init if already connecting or connected
  if (isConnecting || (socket?.connected && status === "connected")) {
    shouldStayOnline = true;
    return;
  }

  const user = await getUserInfo();
  const rawPhone = user?.phone;

  if (!rawPhone) {
    console.error("❌ Cannot connect: No phone number found in storage");
    setStatus("error");
    return;
  }

  const phone = rawPhone.replace(/\D/g, "");
  isConnecting = true;
  shouldStayOnline = true;
  setStatus("connecting");

  // ✅ 1. Check Network First
  const online = await isNetworkOnline();
  if (!online) {
    console.warn(
      "📶 No network detected. Reconnection will trigger when network is back.",
    );
    isConnecting = false;
    setStatus("error");
    return;
  }

  // ✅ 2. Initialize or Reuse Socket
  if (!socket) {
    socket = initializeSocket(rawPhone);
  }

  // ✅ 3. Reset Listeners to avoid duplication
  socket.off("connect");
  socket.off("user:connected");
  socket.off("disconnect");
  socket.off("connect_error");

  // ✅ 4. Re-handshake on EVERY connect (important for transport recovery)
  socket.on("connect", async () => {
    console.log("🔌 Socket transport established. Sending user:connect...");
    const location = await getPassengerLocation();

    socket?.emit("user:connect", {
      phone,
      userType: "passenger",
      ...(location && { location }),
    });
  });

  socket.on("user:connected", () => {
    isConnecting = false;
    setStatus("connected");
    startHeartbeat();
  });

  socket.on("disconnect", (reason) => {
    isConnecting = false;
    console.log(`❌ Socket Disconnected: ${reason}`);

    if (!shouldStayOnline || reason === "io client disconnect") {
      clearTimers();
      setStatus("offline");
    } else {
      setStatus("reconnecting");
      // If server closed the connection, we must manually call connect() to try again
      if (reason === "io server disconnect") {
        socket?.connect();
      }
    }
  });

  socket.on("connect_error", (err) => {
    isConnecting = false;
    console.error("❌ Socket Connect Error:", err.message);
    setStatus("error");

    // ✅ Recursive Retry: Try again in 5 seconds if we are supposed to be online
    if (shouldStayOnline) {
      setTimeout(() => {
        if (shouldStayOnline && status !== "connected") {
          console.log("🔄 Attempting background retry...");
          connectPassenger();
        }
      }, 5000);
    }
  });

  // ✅ 5. Trigger Connection
  if (!socket.connected) {
    socket.connect();
  } else {
    // If already connected but we hit this function, force a re-handshake
    const location = await getPassengerLocation();
    socket.emit("user:connect", {
      phone,
      userType: "passenger",
      ...(location && { location }),
    });
  }
};

export const disconnectPassenger = () => {
  console.log("🔌 Manually disconnecting passenger socket...");
  shouldStayOnline = false;
  isConnecting = false;
  onCancelCallback = null;
  clearTimers();
  if (socket) {
    socket.disconnect();
    // Clear listeners so they don't fire on a dead object
    socket.off();
  }
  setStatus("offline");
};

export const getPassengerSocketStatus = () => status;
export const isPassengerOnline = () => status === "connected";
export const getPassengerSocket = () => socket;
