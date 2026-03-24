import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CancelButton from "../../../../components/CancelButton";
import { theme } from "../../../../constants/theme";
import { getUserInfo } from "../../../../utils/storage";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";

interface SearchingTabProps {
  onCancel: () => void;
  onBackToRide: () => void;
  hasOffers: boolean;
  isActive: boolean;
  onClearOffers?: () => void;
  onContentHeight?: (h: number) => void; // Added for dynamic height
}

const SearchingTab: React.FC<SearchingTabProps> = ({
  onCancel,
  onBackToRide,
  hasOffers,
  isActive,
  onClearOffers,
  onContentHeight, // Destructured prop
}) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCancelling, setIsCancelling] = useState(false);
  const [showNoDrivers, setShowNoDrivers] = useState(false);
  const { updateRideData, rideData } = useRideBooking();
  const [viewingDrivers, setViewingDrivers] = useState<Set<string>>(new Set());
  const viewingDriversCount = viewingDrivers.size;

  const isMounted = useRef(true);
  const NO_DRIVERS_TIMEOUT = 300000;

  useEffect(() => {
    let socketInstance: any;
    const setupSocket = async () => {
      try {
        const { getPassengerSocket } =
          await import("../../socketConnectionUtility/passengerSocketService");
        socketInstance = getPassengerSocket();

        if (!socketInstance) return;

        socketInstance.on(
          "ride:tray_status",
          (data: { status: "opened" | "closed"; driverPhone: string }) => {
            if (!data.driverPhone) return;

            setViewingDrivers((prevSet) => {
              const newSet = new Set(prevSet);
              if (data.status === "opened") {
                newSet.add(data.driverPhone);
              } else {
                newSet.delete(data.driverPhone);
              }
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
        socketInstance.off("ride:tray_status");
      }
    };
  }, [isActive]);

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

    const timer = setTimeout(() => {
      pulseAnim.setValue(1.05);

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

      return () => {
        animation.stop();
        pulseAnim.setValue(1);
      };
    }, 200);

    return () => clearTimeout(timer);
  }, [pulseAnim, showNoDrivers, isActive]);

  const performCancellation = useCallback(
    async (isAutoCancel = false) => {
      if (!isMounted.current || !isActive || isCancelling) return;

      setIsCancelling(true);

      try {
        const userInfo = await getUserInfo();
        const rawPhone = userInfo?.phone || "";
        const formattedPhone = rawPhone.replace(/\D/g, "");

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

        if (result?.rideId) {
          const { getPassengerSocket } =
            await import("../../socketConnectionUtility/passengerSocketService");
          const socket = getPassengerSocket();
          if (socket?.connected) {
            socket.emit("driver:offer_cancelled", {
              rideId: result.rideId,
              passengerPhone: formattedPhone,
            });
          }
        }
      } catch (error) {
        // Error handled silently
      } finally {
        if (isMounted.current) {
          setIsCancelling(false);
          if (onClearOffers) onClearOffers();
          if (!isAutoCancel) {
            setShowNoDrivers(false);
            onCancel();
          }
        }
      }
    },
    [isCancelling, onCancel, isActive, onClearOffers],
  );

  useEffect(() => {
    if (showNoDrivers || !isActive || hasOffers) return;
    const timer = setTimeout(() => {
      if (isMounted.current && isActive && !hasOffers) {
        setShowNoDrivers(true);
        performCancellation(true);
      }
    }, NO_DRIVERS_TIMEOUT);
    return () => clearTimeout(timer);
  }, [hasOffers, showNoDrivers, isActive]);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, vs(20)) },
      ]}
      onLayout={(e) => {
        // Report height of the entire component to the Tray
        const height = e.nativeEvent.layout.height;
        onContentHeight?.(height);
      }}
    >
      <View style={styles.content}>
        {!showNoDrivers ? (
          <>
            <View style={styles.premiumRow}>
              <View style={styles.liveIndicator}>
                <View
                  style={[
                    styles.liveDot,
                    viewingDriversCount === 0 && {
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.liveDotPulse,
                    viewingDriversCount === 0 && {
                      backgroundColor: "rgba(148, 163, 184, 0.2)",
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
            <Ionicons
              name="alert-circle-outline"
              size={ms(50)}
              color="#94a3b8"
            />
            <Text style={styles.title}>No drivers nearby</Text>
            <Text style={styles.subtitleNoDrivers}>
              Try raising your offer or changing vehicle type to attract more
              drivers.
            </Text>
          </View>
        )}
      </View>

      {!showNoDrivers && (
        <View style={styles.buttonWrapper}>
          <CancelButton
            onPress={() => performCancellation(false)}
            isLoading={isCancelling}
          />
        </View>
      )}
    </View>
  );
};

const styles = createStyles({
  container: {
    // Removed flex: 1 to allow content-based height
    paddingHorizontal: s(20),
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(30), // Added vertical padding to replace flex: 1 spacing
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: vs(20),
    paddingHorizontal: s(16),
  },
  liveIndicator: {
    width: ms(20),
    height: ms(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: s(10),
  },
  liveDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: theme.colors.primary,
    zIndex: 2,
  },
  liveDotPulse: {
    position: "absolute",
    width: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    backgroundColor: "rgba(0, 210, 106, 0.2)",
  },
  premiumText: {
    fontSize: ms(14),
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  countHighlight: {
    color: theme.colors.primary,
    fontWeight: "800",
  },
  noDriversContainer: {
    alignItems: "center",
    marginBottom: vs(20),
  },
  pulseCircle: {
    width: ms(70),
    height: ms(70),
    borderRadius: ms(35),
    backgroundColor: theme.colors.primary + "20",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: vs(15),
  },
  title: {
    fontSize: ms(18),
    fontWeight: "700",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: ms(13),
    color: theme.colors.textSecondary,
    marginTop: vs(6),
    textAlign: "center",
  },
  subtitleNoDrivers: {
    fontSize: ms(13),
    color: theme.colors.textSecondary,
    marginTop: vs(6),
    textAlign: "center",
    paddingHorizontal: s(10),
  },
  buttonWrapper: {
    width: "100%",
    marginTop: vs(20),
  },
});

export default SearchingTab;
