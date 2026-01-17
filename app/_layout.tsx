import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { initializeAuthToken } from "../utils/api";
import { getUserInfo } from "../utils/storage";
import { RideBookingProvider } from "./context/RideBookingContext";
import { connectDriver, getDriverSocketStatus } from "./driver/socketConnectionUtility/driverSocketService";
import { connectPassenger, getPassengerSocketStatus } from "./passenger/socketConnectionUtility/passengerSocketService";

export default function RootLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 1. Initialize API Token
    initializeAuthToken();

    // 2. Set up AppState Listener for Socket Persistence
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("📱 App foregrounded. Syncing socket...");

      const user = await getUserInfo();
      if (!user) return;

      // Only re-trigger if the service was already supposed to be active
      if (user.userType === "driver") {
        const status = getDriverSocketStatus();
        if (status !== "offline") {
          await connectDriver();
        }
      } else if (user.userType === "passenger") {
        const status = getPassengerSocketStatus();
        if (status !== "offline") {
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