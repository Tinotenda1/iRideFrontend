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

import { initializeAuthToken } from "../utils/api";
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
      console.log(
        `📱 App state changed: ${appState.current} → ${nextAppState}`,
      );
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("🔄 App came to foreground, checking socket status...");
        try {
          setReconnecting(true);
          setReconnectError(null);

          const userData = await import("../utils/storage").then((mod) =>
            mod.getUserInfo(),
          );
          if (!userData) return;

          if (userData.userType === "driver") {
            const status = getDriverSocketStatus();
            console.log(`🔌 Driver socket status on resume: ${status}`);
            if (status === "offline" || status === "error") {
              await reconnectWithTimeout(connectDriver);
              console.log("✅ Driver socket reconnected!");
            }
          } else if (userData.userType === "passenger") {
            const status = getPassengerSocketStatus();
            console.log(`🔌 Passenger socket status on resume: ${status}`);
            if (status === "offline" || status === "error") {
              await reconnectWithTimeout(connectPassenger);
              console.log("✅ Passenger socket reconnected!");
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
      console.log("🚀 Initial socket connection starting...");
      setReconnecting(true);
      setReconnectError(null);

      const userData = await import("../utils/storage").then((mod) =>
        mod.getUserInfo(),
      );

      if (!userData) {
        console.log("⚠️ No user data found, skipping socket connection.");
        return;
      }

      console.log(`👤 User type detected: ${userData.userType}`);

      if (userData.userType === "driver") {
        const status = getDriverSocketStatus();
        console.log(`🔌 Current driver socket status: ${status}`);
        if (status === "offline" || status === "error") {
          console.log("⏳ Connecting driver socket...");
          await reconnectWithTimeout(connectDriver);
          console.log("✅ Driver socket connected!");
        }
      } else if (userData.userType === "passenger") {
        const status = getPassengerSocketStatus();
        console.log(`🔌 Current passenger socket status: ${status}`);
        if (status === "offline" || status === "error") {
          console.log("⏳ Connecting passenger socket...");
          await reconnectWithTimeout(connectPassenger);
          console.log("✅ Passenger socket connected!");
        }
      }
    } catch (error: any) {
      console.error("❌ Error connecting sockets:", error);
      setReconnectError(error?.toString() || "Unknown error");
    } finally {
      setReconnecting(false);
      console.log("⚡ Initial socket connection process finished.");
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuthToken();
        console.log("🔐 Auth token initialized");
      } catch (e) {
        console.warn("⚠️ Failed to initialize auth token", e);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    initialSocketConnection();

    return () => subscription.remove();
  }, [handleAppStateChange, initialSocketConnection]);

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
