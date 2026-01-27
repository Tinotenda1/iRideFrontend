import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { initializeAuthToken } from "../utils/api";
import { getUserInfo } from "../utils/storage";
import { RideBookingProvider } from "./context/RideBookingContext";
import {
  connectDriver,
  getDriverSocketStatus,
} from "./driver/socketConnectionUtility/driverSocketService";
import {
  connectPassenger,
  getPassengerSocketStatus,
} from "./passenger/socketConnectionUtility/passengerSocketService";

export default function RootLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initialize API Token for Axios/Fetch
    initializeAuthToken();

    // 2. Set up AppState Listener for Socket Persistence
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // 3. Initial connection attempt on app launch
    const initialSync = async () => {
      const user = await getUserInfo();
      if (user?.userType === "driver") {
        await connectDriver();
      } else if (user?.userType === "passenger") {
        await connectPassenger();
      }
    };
    initialSync();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Check if the app is coming to the foreground
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("📱 App foregrounded. Syncing socket connection...");

      const user = await getUserInfo();
      if (!user) return;

      /**
       * ⚡ HEAVY LIFTING: Reconnection Logic
       * We only call connect if the status isn't "offline".
       * "offline" means the user manually disconnected or hasn't logged in.
       * "error", "reconnecting", or "connected" (but stale) will trigger a re-sync.
       */
      if (user.userType === "driver") {
        const status = getDriverSocketStatus();
        if (status !== "offline") {
          console.log("🚚 Syncing Driver Socket...");
          await connectDriver();
        }
      } else if (user.userType === "passenger") {
        const status = getPassengerSocketStatus();
        if (status !== "offline") {
          console.log("乘客 Syncing Passenger Socket...");
          await connectPassenger();
        }
      }
    }

    appState.current = nextAppState;
  };

  return (
    <RideBookingProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RideBookingProvider>
  );
}
