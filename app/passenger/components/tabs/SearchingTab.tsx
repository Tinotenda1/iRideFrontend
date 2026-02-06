import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, BackHandler, StyleSheet, Text, View } from "react-native";
import { theme } from "../../../../constants/theme";
import { getUserInfo } from "../../../../utils/storage";
// Import the new component
import CancelButton from "../../../../components/CancelButton";

interface SearchingTabProps {
  onCancel: () => void;
  onBackToRide: () => void;
  hasOffers: boolean;
  isActive: boolean;
}

const SearchingTab: React.FC<SearchingTabProps> = ({
  onCancel,
  onBackToRide,
  hasOffers,
  isActive,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCancelling, setIsCancelling] = useState(false);
  const [showNoDrivers, setShowNoDrivers] = useState(false);

  const isMounted = useRef(true);
  const NO_DRIVERS_TIMEOUT = 60000; // 60 seconds

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      console.log("🚫 SearchingTab Unmounted: All background tasks blocked.");
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const backAction = () => {
      if (showNoDrivers) {
        setShowNoDrivers(false);
        onBackToRide();
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

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
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
  }, [pulseAnim, showNoDrivers, isActive]);

  const performCancellation = useCallback(
    async (isAutoCancel = false) => {
      if (!isMounted.current || !isActive || isCancelling) return;

      setIsCancelling(true);
      try {
        const userInfo = await getUserInfo();
        const formattedPhone = userInfo?.phone?.replace("+", "") || "";

        console.log(
          `📡 Sending ${isAutoCancel ? "Auto-" : "Manual "}Cancel Request...`,
        );

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-device-id":
                userInfo?.currentDeviceId || userInfo?.deviceId || "",
            },
            body: JSON.stringify({ passengerPhone: formattedPhone }),
          },
        );

        const result = await response.json();
        console.log("✅ Cancel response:", result);
      } catch (error) {
        console.error("❌ Cancel failed:", error);
      } finally {
        if (isMounted.current) {
          setIsCancelling(false);
          if (!isAutoCancel) {
            setShowNoDrivers(false);
            onCancel();
          }
        }
      }
    },
    [isCancelling, onCancel, isActive],
  );

  useEffect(() => {
    if (showNoDrivers || !isActive || hasOffers) {
      return;
    }

    const timer = setTimeout(() => {
      if (isMounted.current && isActive && !hasOffers) {
        console.log("⏱️ Timeout triggered: No offers found.");
        setShowNoDrivers(true);
        performCancellation(true);
      } else {
        console.log("🛡️ Auto-cancel blocked: Match confirmed or tab exited.");
      }
    }, NO_DRIVERS_TIMEOUT);

    return () => {
      console.log("🧹 Clearing SearchingTab timer");
      clearTimeout(timer);
    };
  }, [hasOffers, showNoDrivers, performCancellation, isActive]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {!showNoDrivers ? (
          <>
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
