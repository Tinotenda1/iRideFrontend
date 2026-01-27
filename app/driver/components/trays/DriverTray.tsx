// app/driver/components/trays/DriverTray.tsx
import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import { createStyles } from "../../../../utils/styles";

import { useRideBooking } from "../../../../app/context/RideBookingContext";
import {
  getDriverSocket,
  onMatchedRide,
} from "../../socketConnectionUtility/driverSocketService";
import OnlineTab from "./tabs/OnlineTab";
import TripTab from "./tabs/TripTab";
import WelcomeTab from "./tabs/WelcomeTab";

interface DriverTrayProps {
  onStatusChange?: (status: DriverStatus) => void;
  onHeightChange?: (height: number) => void;
  onMatch?: () => void;
}

type DriverStatus = "welcome" | "online" | "active";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

const HEIGHT_WELCOME = windowHeight * 0.35;
const HEIGHT_ONLINE = windowHeight * 0.3;
const HEIGHT_ACTIVE = windowHeight * 0.55;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DriverTray = forwardRef<any, DriverTrayProps>(
  ({ onStatusChange, onHeightChange, onMatch }, ref) => {
    const [status, setStatus] = useState<DriverStatus>("welcome");
    const { rideData, updateRideData } = useRideBooking();

    const heightAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const transitionAnim = useRef(new Animated.Value(0)).current;

    const openTray = useCallback(() => {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 80,
      }).start();
    }, [translateY]);

    const closeTray = useCallback(() => {
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [translateY]);

    const handleTransition = useCallback(
      (target: DriverStatus) => {
        if (target === status) return;

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStatus(target);
        onStatusChange?.(target);

        const stateMap = { welcome: 0, online: 1, active: 2 };
        const targetValue = stateMap[target];

        Animated.spring(transitionAnim, {
          toValue: targetValue,
          useNativeDriver: true,
          damping: 25,
          stiffness: 100,
        }).start();

        Animated.spring(heightAnim, {
          toValue: targetValue,
          useNativeDriver: false,
          speed: 12,
          bounciness: 4,
        }).start();
      },
      [status, onStatusChange, transitionAnim, heightAnim],
    );

    useEffect(() => {
      const listenerId = heightAnim.addListener(({ value }) => {
        let actualHeight = HEIGHT_WELCOME;
        if (value <= 1) {
          actualHeight =
            HEIGHT_WELCOME + value * (HEIGHT_ONLINE - HEIGHT_WELCOME);
        } else {
          actualHeight =
            HEIGHT_ONLINE + (value - 1) * (HEIGHT_ACTIVE - HEIGHT_ONLINE);
        }
        onHeightChange?.(actualHeight);
      });

      onHeightChange?.(HEIGHT_WELCOME);
      return () => heightAnim.removeListener(listenerId);
    }, [heightAnim, onHeightChange]);

    useEffect(() => {
      openTray();

      const unsubscribeMatched = onMatchedRide((matchedData: any) => {
        console.log("📥 Driver matched payload:", matchedData);

        // ✅ FIX: Un-nest the data so TripTab can find 'passenger' immediately
        // Some backends send { tripDetails: { passenger: ... } }
        // Others send { passenger: ... } directly.
        const actualTripData = matchedData.tripDetails || matchedData;

        // 1. Clear Context and update with normalized trip data
        updateRideData({
          requests: [],
          activeTrip: actualTripData,
          status: "matched",
        });

        // 2. Notify Parent (Clears Dashboard Radar & Cards)
        onMatch?.();

        // 3. Move UI to Active Trip Tab
        handleTransition("active");
      });

      return () => unsubscribeMatched();
    }, [openTray, handleTransition, updateRideData, onMatch]);

    useImperativeHandle(ref, () => ({
      openTray,
      closeTray,
      goOnline: () => handleTransition("online"),
      startTrip: () => handleTransition("active"),
      goOffline: () => handleTransition("welcome"),
    }));

    const handleArrived = () => {
      const socket = getDriverSocket();
      socket?.emit("ride:driver_arrived", {
        rideId:
          rideData.activeTrip?.ride?.ride_id || rideData.activeTrip?.rideId,
        driverPhone: rideData.activeTrip?.driver?.phone,
      });
      updateRideData({ status: "arrived" });
    };

    const handleStartTrip = () => {
      const socket = getDriverSocket();
      socket?.emit("ride:start_trip", {
        rideId:
          rideData.activeTrip?.ride?.ride_id || rideData.activeTrip?.rideId,
      });
      updateRideData({ status: "on_trip" });
    };

    // Interpolations
    const welcomeTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, -windowWidth, -windowWidth * 2],
    });

    const onlineTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [windowWidth, 0, -windowWidth],
    });

    const activeTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [windowWidth * 2, windowWidth, 0],
    });

    const currentTrayHeight = heightAnim.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [HEIGHT_WELCOME, HEIGHT_ONLINE, HEIGHT_ACTIVE],
    });

    return (
      <Animated.View
        style={[styles.container, { transform: [{ translateY }] }]}
      >
        <Animated.View style={{ height: currentTrayHeight, width: "100%" }}>
          <LinearGradient
            colors={["#FFFFFF", "#F8FAFC"]}
            style={styles.background}
          />
          <View style={styles.contentContainer}>
            <View style={styles.tabsWrapper}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { transform: [{ translateX: welcomeTranslateX }] },
                ]}
              >
                <WelcomeTab onGoOnline={() => handleTransition("online")} />
              </Animated.View>

              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { transform: [{ translateX: onlineTranslateX }] },
                ]}
              >
                <OnlineTab onGoOffline={() => handleTransition("welcome")} />
              </Animated.View>

              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { transform: [{ translateX: activeTranslateX }] },
                ]}
              >
                <TripTab
                  onArrived={handleArrived}
                  onStartTrip={handleStartTrip}
                  onCancel={() => handleTransition("online")}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    );
  },
);

DriverTray.displayName = "DriverTray";

const styles = createStyles({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 24,
    overflow: "hidden",
  },
  background: { ...StyleSheet.absoluteFillObject },
  contentContainer: { flex: 1 },
  tabsWrapper: { flex: 1 },
});

export default DriverTray;
