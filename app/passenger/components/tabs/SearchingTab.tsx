// app/passenger/components/tabs/SearchingTab.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, StyleSheet, Text, View } from "react-native";
import CancelButton from "../../../../components/CancelButton";
import { theme } from "../../../../constants/theme";
import { getUserInfo } from "../../../../utils/storage";
import { useRideBooking } from "../../../context/RideBookingContext";

interface SearchingTabProps {
  onCancel: () => void;
  onBackToRide: () => void;
  hasOffers: boolean;
  isActive: boolean;
  onClearOffers?: () => void;
}

const SearchingTab: React.FC<SearchingTabProps> = ({
  onCancel,
  onBackToRide,
  hasOffers,
  isActive,
  onClearOffers,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCancelling, setIsCancelling] = useState(false);
  const [showNoDrivers, setShowNoDrivers] = useState(false);
  const { updateRideData, rideData } = useRideBooking();
  const [viewingDrivers, setViewingDrivers] = useState<Set<string>>(new Set());
  // The derived count for your UI
  const viewingDriversCount = viewingDrivers.size;

  const isMounted = useRef(true);
  const NO_DRIVERS_TIMEOUT = 300000; // 5 minutes

  /*
  // ✅ Log on mount/prop change
  useEffect(() => {
    console.log("👀 [SearchingTab] Prop update:", {
      isActive,
      hasOnClearOffers: !!onClearOffers,
    });
  }, [isActive, onClearOffers]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      console.log("🚫 [SearchingTab] Unmounted");
    };
  }, []);
  */

  // ✅ Listen for drivers opening/closing the ride view
  useEffect(() => {
    console.log("🎬 [SearchingTab] Listener mounting...");
    let socketInstance: any;

    const setupSocket = async () => {
      try {
        const { getPassengerSocket } =
          await import("../../socketConnectionUtility/passengerSocketService");
        socketInstance = getPassengerSocket();

        if (!socketInstance) {
          console.error("❌ [SearchingTab] Socket utility returned null");
          return;
        }

        // Start listening immediately
        console.log(
          "📡 [SearchingTab] Attaching 'ride:tray_status' listener...",
        );

        socketInstance.on(
          "ride:tray_status",
          (data: { status: "opened" | "closed"; driverPhone: string }) => {
            console.log("📥 [SearchingTab] Socket Event Received:", data);

            if (!data.driverPhone) {
              console.warn(
                "⚠️ [SearchingTab] Received event without driverPhone. Skipping.",
              );
              return;
            }

            setViewingDrivers((prevSet) => {
              const newSet = new Set(prevSet);
              if (data.status === "opened") {
                newSet.add(data.driverPhone);
              } else {
                newSet.delete(data.driverPhone);
              }
              console.log(`📊 [SearchingTab] Updated Count: ${newSet.size}`);
              return newSet;
            });
          },
        );
      } catch (err) {
        console.error("❌ [SearchingTab] Setup Error:", err);
      }
    };

    setupSocket();

    return () => {
      if (socketInstance) {
        console.log("🧹 [SearchingTab] Cleaning up listener");
        socketInstance.off("ride:tray_status");
      }
    };
  }, [isActive]); // Empty dependency array: runs once on mount, stays active until unmount.// This ensures if the ID finally arrives, we start listening.

  useEffect(() => {
    if (!isActive) return;
    const backAction = () => {
      if (showNoDrivers) {
        setShowNoDrivers(false);
        onBackToRide();
        updateRideData({ status: "booking" });
        return true;
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [showNoDrivers, onBackToRide, isActive]);

  useEffect(() => {
    if (showNoDrivers || !isActive) {
      pulseAnim.setValue(1);
      return;
    }

    // Wait for layout to settle
    const timer = setTimeout(() => {
      pulseAnim.setValue(1.05); // start slightly scaled

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );

      animation.start();

      // Cleanup
      return () => {
        animation.stop();
        pulseAnim.setValue(1);
      };
    }, 200); // 50ms is usually enough

    return () => clearTimeout(timer);
  }, [pulseAnim, showNoDrivers, isActive]);

  const performCancellation = useCallback(
    async (isAutoCancel = false) => {
      console.log("1️⃣ [SearchingTab] performCancellation started");

      if (!isMounted.current) {
        console.log("❌ [SearchingTab] Cancel aborted: Component unmounted");
        return;
      }

      if (!isActive) {
        console.log("❌ [SearchingTab] Cancel aborted: Tab not active");
        return;
      }

      if (isCancelling) {
        console.log("❌ [SearchingTab] Cancel aborted: Already cancelling");
        return;
      }

      setIsCancelling(true);

      try {
        const userInfo = await getUserInfo();

        const rawPhone = userInfo?.phone || "";
        const formattedPhone = rawPhone.replace(/\D/g, "");

        console.log("2️⃣ [SearchingTab] Sending cancel API request...");

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-device-id":
                userInfo?.currentDeviceId || userInfo?.deviceId || "",
            },
            body: JSON.stringify({
              userPhone: formattedPhone,
              reason: isAutoCancel
                ? "No drivers available"
                : "Cancelled by passenger",
            }),
          },
        );

        const result = await response.json();

        console.log("3️⃣ [SearchingTab] API Response:", result);

        /* =====================================================
         ✅ SOCKET NOTIFICATION (CRITICAL FIX)
      ===================================================== */

        if (result?.rideId) {
          console.log("📡 [SearchingTab] Emitting driver:offer_cancelled:", {
            rideId: result.rideId,
            passengerPhone: formattedPhone,
          });

          // Lazy import to avoid circular deps
          const { getPassengerSocket } =
            await import("../../socketConnectionUtility/passengerSocketService");

          const socket = getPassengerSocket();

          if (socket?.connected) {
            socket.emit("driver:offer_cancelled", {
              rideId: result.rideId,
              passengerPhone: formattedPhone,
            });
          } else {
            /*console.warn(
              "⚠️ [SearchingTab] Socket not connected, cancel not emitted",
            );*/
          }
        } else {
          /*console.warn(
            "⚠️ [SearchingTab] Cancel API did not return rideId:",
            result,
          );*/
        }
      } catch (error) {
        //console.error("❌ [SearchingTab] Cancel API failed:", error);
      } finally {
        if (isMounted.current) {
          //console.log("4️⃣ [SearchingTab] Finally block executing");

          setIsCancelling(false);

          if (onClearOffers) {
            // console.log("5️⃣ [SearchingTab] Calling onClearOffers()...");
            onClearOffers();
          }

          if (!isAutoCancel) {
            setShowNoDrivers(false);
            //updateRideData({ status: "idle" });
            onCancel();
          }
        }
      }
    },
    [isCancelling, onCancel, isActive, onClearOffers],
  );

  useEffect(() => {
    if (showNoDrivers || !isActive || hasOffers) {
      return;
    }
    const timer = setTimeout(() => {
      if (isMounted.current && isActive && !hasOffers) {
        console.log("⏱️ [SearchingTab] Timeout: Auto-cancelling");
        setShowNoDrivers(true);
        performCancellation(true);
      }
    }, NO_DRIVERS_TIMEOUT);
    return () => clearTimeout(timer);
  }, [hasOffers, showNoDrivers, isActive]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {!showNoDrivers ? (
          <>
            {!showNoDrivers && (
              <View style={styles.premiumRow}>
                <View style={styles.liveIndicator}>
                  <View
                    style={[
                      styles.liveDot,
                      viewingDriversCount === 0 && {
                        backgroundColor: "#94A3B8", // Grey when 0
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.liveDotPulse,
                      viewingDriversCount === 0 && {
                        backgroundColor: "rgba(148, 163, 184, 0.2)", // Grey pulse
                      },
                    ]}
                  />
                </View>
                <Text style={styles.premiumText}>
                  <Text
                    style={[
                      styles.countHighlight,
                      viewingDriversCount === 0 && { color: "#64748b" },
                    ]}
                  >
                    {viewingDriversCount}
                  </Text>
                  {viewingDriversCount === 1 ? " driver is " : " drivers are "}
                  currently viewing your request
                </Text>
              </View>
            )}
            <Animated.View
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={styles.title}>Searching for rides...</Text>
            <Text style={styles.subtitle}>This may take a few moments</Text>
          </>
        ) : (
          <View style={styles.noDriversContainer}>
            <Ionicons name="alert-circle-outline" size={50} color="#94a3b8" />
            <Text style={styles.title}>No drivers nearby</Text>
            <Text
              style={[
                styles.subtitle,
                { textAlign: "center", paddingHorizontal: 10 },
              ]}
            >
              Try raising your offer or changing vehicle type to attract more
              drivers.
            </Text>
          </View>
        )}
      </View>

      {!showNoDrivers && (
        <CancelButton
          onPress={() => performCancellation(false)}
          isLoading={isCancelling}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (container and content styles remain the same)
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  liveIndicator: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00D26A", // Matches Driver OnlineTab
    zIndex: 2,
  },
  liveDotPulse: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 210, 106, 0.2)", // Matches Driver OnlineTab
  },
  premiumText: {
    fontSize: 16, // Adjusted for better fit with the larger dot
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  countHighlight: {
    color: "#00D26A", // Primary brand green
    fontWeight: "800",
  },
  // ... (rest of the styles remain unchanged)
  noDriversContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  pulseCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary + "20",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
});

export default SearchingTab;
