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
import RatingModal from "../../../../components/RatingModal"; // Adjust path
import { submitUserRating } from "../../../../utils/ratingSubmittion";
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
    const [ratingVisible, setRatingVisible] = useState(false);

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

        // 1. Extract the ID from the root and the details from the nested object
        const rideId = matchedData.rideId;
        const details = matchedData.tripDetails;

        // 2. Save them together in the activeTrip state
        updateRideData({
          requests: [],
          activeTrip: {
            ...details, // This brings in passenger, ride, vehicle, etc.
            rideId: rideId, // This ensures the ID is attached for socket calls
          },
          status: "matched",
        });

        onMatch?.();
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
      // Now that we've flattened the ID into activeTrip, we grab it here:
      const rId = rideData.activeTrip?.rideId;

      if (!rId) {
        console.error("❌ Cannot emit arrival: rideId is missing from state");
        return;
      }

      socket?.emit("ride:driver_arrived", {
        rideId: rId,
        driverPhone: rideData.activeTrip?.driver?.phone,
      });

      console.log("🚗 Driver arrived for ride:", rId);
      updateRideData({ status: "arrived" });
    };

    const handleStartTrip = () => {
      const socket = getDriverSocket();
      const rId = rideData.activeTrip?.rideId;

      if (rId) {
        socket?.emit("ride:start_trip", { rideId: rId });
        updateRideData({ status: "on_trip" });
      }
    };

    const handleEndTrip = async () => {
      const rId = rideData.activeTrip?.rideId;
      if (!rId) return;

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/end_ride`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rideId: rId }),
          },
        );

        const result = await response.json();

        if (result.success) {
          // ✅ Change status to "idle" and UI to "online", but KEEP activeTrip data
          updateRideData({ status: "idle" });
          handleTransition("online");
          setRatingVisible(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const handleRatingSubmit = async (stars: number, comment: string) => {
      const rideId = rideData.activeTrip?.rideId;
      const passengerPhone = rideData.activeTrip?.passenger?.phone;

      if (rideId && passengerPhone) {
        await submitUserRating(
          "passenger",
          passengerPhone,
          rideId,
          stars,
          comment,
        );
      }

      // ✅ FINALLY set activeTrip to null here
      updateRideData({ activeTrip: null });
      setRatingVisible(false);
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
                  onEndTrip={handleEndTrip}
                />
              </Animated.View>
              <RatingModal
                visible={ratingVisible}
                title="Rate Your Passenger"
                userName={rideData.activeTrip?.passenger?.name}
                userImage={rideData.activeTrip?.passenger?.profilePic}
                subtitle="Your feedback helps keep the community safe."
                onSelectRating={handleRatingSubmit}
                // Remove onClose
              />
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
