// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  View,
} from "react-native";
import { initializeAuthToken } from "../utils/api";
import { getUserInfo } from "../utils/storage";
import {
  RideBookingProvider,
  useRideBooking,
} from "./context/RideBookingContext";
import {
  connectDriver,
  getDriverSocketStatus,
} from "./driver/socketConnectionUtility/driverSocketService";
import {
  connectPassenger,
  getPassengerSocketStatus,
} from "./passenger/socketConnectionUtility/passengerSocketService";

function RootContent() {
  const { checkExistingState, reconnecting } = useRideBooking();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    initializeAuthToken();

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    const initialSync = async () => {
      const user = await getUserInfo();
      if (!user) {
        // If no user, we can't reconnect, so stop loading
        // (Assuming you have a way to set reconnecting to false in context if needed)
        return;
      }

      // 1. Establish Socket Connection
      if (user.userType === "driver") {
        await connectDriver();
      } else if (user.userType === "passenger") {
        await connectPassenger();
      }

      // 2. Fetch Source of Truth from Backend
      await checkExistingState();
    };

    initialSync();

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      const user = await getUserInfo();
      if (!user) return;

      if (user.userType === "driver") {
        if (getDriverSocketStatus() !== "offline") await connectDriver();
      } else if (user.userType === "passenger") {
        if (getPassengerSocketStatus() !== "offline") await connectPassenger();
      }

      // Re-sync state whenever app comes to foreground
      await checkExistingState();
    }
    appState.current = nextAppState;
  };

  // ⚡ IMPLEMENTING LOADING STATE
  if (reconnecting) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <RideBookingProvider>
      <RootContent />
    </RideBookingProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10B981",
  },
});
