// app/_layout.tsx
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, StyleSheet } from "react-native";

import { initializeAuthToken } from "../utils/api";
import {
  checkUserSession,
  getUserInfo,
  validateDeviceId,
} from "../utils/storage";

import {
  RideBookingProvider
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
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // 🔄 Handle app going to background/foreground
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const user = await getUserInfo();
        if (!user) return;

        // 1️⃣ Device validation
        const { isValid: deviceValid } = await validateDeviceId();
        if (!deviceValid) return;

        // 2️⃣ Session check
        const session = await checkUserSession();
        if (!session.isAuthenticated || !session.onboardingCompleted) return;

        // 4️⃣ Socket reconnect
        if (
          user.userType === "driver" &&
          getDriverSocketStatus() !== "offline"
        ) {
          await connectDriver();
        } else if (
          user.userType === "passenger" &&
          getPassengerSocketStatus() !== "offline"
        ) {
          await connectPassenger();
        }
      }
      appState.current = nextAppState;
    },
    [],
  );

  // 🔄 Initial boot sequence
  const initialSync = useCallback(async () => {
    const user = await getUserInfo();
    if (!user) return;

    // 1️⃣ Device validation
    const { isValid: deviceValid } = await validateDeviceId();
    if (!deviceValid) {
      console.warn("Device not valid, stopping reconnection.");
      return;
    }

    // 2️⃣ Session check
    const session = await checkUserSession();
    if (!session.isAuthenticated || !session.onboardingCompleted) {
      console.warn("Session invalid, redirect to login.");
      return;
    }

    // 3️⃣ Restore previous session (ride state)

    // 4️⃣ Connect socket AFTER session restored
    if (user.userType === "driver") {
      await connectDriver();
    } else {
      await connectPassenger();
    }
  }, []);

  useEffect(() => {
    initializeAuthToken();

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    initialSync();

    return () => subscription.remove();
  }, [handleAppStateChange, initialSync]);

  /*/ ⚡ Show loader while reconnecting
  if (reconnecting) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }*/

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
