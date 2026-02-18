// app/_layout.tsx
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  View,
} from "react-native";

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
  return (
    <RideBookingProvider>
      <RootContent />
    </RideBookingProvider>
  );
}

function RootContent() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [reconnecting, setReconnecting] = useState(false);

  // 🔄 Handle app going to background/foreground
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        try {
          setReconnecting(true);

          const userData = await import("../utils/storage").then((mod) =>
            mod.getUserInfo(),
          );
          if (!userData) return;

          // Only reconnect sockets; session/device is already handled by SessionChecker
          if (
            userData.userType === "driver" &&
            getDriverSocketStatus() !== "offline"
          ) {
            await connectDriver();
          } else if (
            userData.userType === "passenger" &&
            getPassengerSocketStatus() !== "offline"
          ) {
            await connectPassenger();
          }
        } catch (error) {
          console.error("❌ Error reconnecting sockets:", error);
        } finally {
          setReconnecting(false);
        }
      }
      appState.current = nextAppState;
    },
    [],
  );

  // 🔄 Initial socket connection (after session/device already validated)
  const initialSocketConnection = useCallback(async () => {
    try {
      setReconnecting(true);
      const userData = await import("../utils/storage").then((mod) =>
        mod.getUserInfo(),
      );
      if (!userData) return;

      if (userData.userType === "driver") {
        await connectDriver();
      } else {
        await connectPassenger();
      }
    } catch (error) {
      console.error("❌ Error connecting sockets:", error);
    } finally {
      setReconnecting(false);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    initialSocketConnection();

    return () => subscription.remove();
  }, [handleAppStateChange, initialSocketConnection]);

  // ⚡ Show loader only while reconnecting sockets
  if (reconnecting) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10B981",
  },
});
