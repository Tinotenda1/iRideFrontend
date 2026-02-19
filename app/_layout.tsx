// app/_layout.tsx
import { Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
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
  const [reconnectError, setReconnectError] = useState<string | null>(null);

  // Helper: reconnect with timeout
  const reconnectWithTimeout = async (
    connectFn: () => Promise<void>,
    timeout = 10000,
  ) => {
    return new Promise<void>((resolve, reject) => {
      let done = false;

      connectFn()
        .then(() => {
          if (!done) {
            done = true;
            resolve();
          }
        })
        .catch((err) => {
          if (!done) {
            done = true;
            reject(err);
          }
        });

      setTimeout(() => {
        if (!done) {
          done = true;
          reject("Timeout connecting socket");
        }
      }, timeout);
    });
  };

  // 🔄 Handle app going to background/foreground
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        try {
          setReconnecting(true);
          setReconnectError(null);

          const userData = await import("../utils/storage").then((mod) =>
            mod.getUserInfo(),
          );
          if (!userData) return;

          if (userData.userType === "driver") {
            const status = getDriverSocketStatus();
            if (status === "offline" || status === "error") {
              await reconnectWithTimeout(connectDriver);
            }
          } else if (userData.userType === "passenger") {
            const status = getPassengerSocketStatus();
            if (status === "offline" || status === "error") {
              await reconnectWithTimeout(connectPassenger);
            }
          }
        } catch (error: any) {
          console.error("❌ Error reconnecting sockets:", error);
          setReconnectError(error?.toString() || "Unknown error");
        } finally {
          setReconnecting(false);
        }
      }
      appState.current = nextAppState;
    },
    [],
  );

  // 🔄 Initial socket connection
  const initialSocketConnection = useCallback(async () => {
    try {
      setReconnecting(true);
      setReconnectError(null);

      const userData = await import("../utils/storage").then((mod) =>
        mod.getUserInfo(),
      );
      if (!userData) return;

      if (userData.userType === "driver") {
        const status = getDriverSocketStatus();
        if (status === "offline" || status === "error") {
          await reconnectWithTimeout(connectDriver);
        }
      } else if (userData.userType === "passenger") {
        const status = getPassengerSocketStatus();
        if (status === "offline" || status === "error") {
          await reconnectWithTimeout(connectPassenger);
        }
      }
    } catch (error: any) {
      console.error("❌ Error connecting sockets:", error);
      setReconnectError(error?.toString() || "Unknown error");
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

  // ⚡ Loader / Error screen
  if (reconnecting) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (reconnectError) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: "#fff", textAlign: "center" }}>
            Failed to connect: {reconnectError}
          </Text>
        </View>
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
