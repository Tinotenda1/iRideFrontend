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

import * as Notifications from "expo-notifications";
import { initializeAuthToken } from "../utils/api";
import {
  clearPersistentNotifications,
  showPersistentNotification,
} from "../utils/persistentNotification";
import { getLastRideStatus } from "../utils/storage";
import { getDriverSocketStatus } from "./driver/socketConnectionUtility/driverSocketService";
import {
  connectPassenger,
  getPassengerSocketStatus,
} from "./passenger/socketConnectionUtility/passengerSocketService";
import { useSessionRestoration } from "./services/useSessionRestoration";

export default function RootLayout() {
  return (
    <RideBookingProvider>
      <RootContent />
    </RideBookingProvider>
  );
}

function RootContent() {
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectError, setReconnectError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const { restoreSession } = useSessionRestoration();

  // Session restore
  useEffect(() => {
    const hydrateApp = async () => {
      try {
        const localStatus = await getLastRideStatus();

        const criticalStatuses = ["matched", "arrived", "on_trip", "on_rating"];

        console.log("[Hydration] Local stored status:", localStatus);

        if (localStatus && criticalStatuses.includes(localStatus)) {
          console.log(
            `[Hydration] 🔄 Restoration STARTED (status: ${localStatus})`,
          );

          const restored = await restoreSession();

          console.log("[Hydration] ✅ Restoration COMPLETED");
          console.log("[Hydration] 📦 Restored payload:", restored);
        } else {
          console.log(
            "[Hydration] ⏭️ No restoration needed (idle or no active ride)",
          );
        }
      } catch (err) {
        console.error("❌ [Hydration] Restoration FAILED:", err);
      } finally {
        setIsHydrated(true);
        console.log("[Hydration] 🚀 App hydration complete");
      }
    };

    hydrateApp();
  }, []);

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Notifications permission not granted");
      }
    };

    requestPermission();
  }, []);

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

  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      console.log(
        `📱 App state changed: ${lastAppState.current} → ${nextAppState}`,
      );

      // 🔹 Only fire when moving from active → background
      if (
        lastAppState.current === "active" &&
        nextAppState.match(/background|inactive/)
      ) {
        console.log(
          "📴 App moved to background → showing persistent notification",
        );
        await showPersistentNotification();
      }

      // 🔹 Only fire when moving from background/inactive → active
      if (
        lastAppState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log(
          "🔄 App came to foreground, clearing persistent notifications",
        );
        await clearPersistentNotifications();

        try {
          setReconnecting(true);
          setReconnectError(null);

          const userData = await import("../utils/storage").then((mod) =>
            mod.getUserInfo(),
          );
          if (!userData) return;

          if (userData.userType === "driver") {
            console.log("🛑 Skipping auto-connect for driver (manual control)");
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

      // Update lastAppState after handling
      lastAppState.current = nextAppState;
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
        if (userData.userType === "driver") {
          console.log("🛑 Driver reconnect skipped (manual control)");
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

  if (!isHydrated) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: "#fff", marginTop: 10 }}>
          Restoring your session...
        </Text>
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
