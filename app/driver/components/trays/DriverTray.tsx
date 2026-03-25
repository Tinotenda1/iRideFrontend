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
  Alert,
  Animated,
  AppState,
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from "react-native";

import { submitUserRating } from "../../../../utils/ratingSubmittion";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";

import RatingModal from "../../../../components/RatingModal";
import {
  getDriverSocket,
  onMatchedRide,
  onRideCancelled,
  onRideCompletedByPassenger,
} from "../../socketConnectionUtility/driverSocketService";

import { theme } from "@/constants/theme";
import { ms, vs } from "@/utils/responsive";
import { getUserInfo } from "@/utils/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModalType } from "../../../../components/TripStatusModal";
import { notifyRideEvent } from "../../../../utils/persistentNotification";
import OnlineTab from "./tabs/OnlineTab";
import TripTab from "./tabs/TripTab";
import WelcomeTab from "./tabs/WelcomeTab";

interface DriverTrayProps {
  onStatusChange?: (status: DriverStatus) => void;
  onHeightChange?: (height: number) => void;
  onMatch?: () => void;
  isOnline: boolean;
}

type DriverStatus = "welcome" | "online" | "active";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DriverTray = forwardRef<any, DriverTrayProps>(
  ({ onStatusChange, onHeightChange, onMatch, isOnline }, ref) => {
    const insets = useSafeAreaInsets();
    const [status, setStatus] = useState<DriverStatus>("welcome");
    const [isTripExpanded, setIsTripExpanded] = useState(false);

    const [tabHeights, setTabHeights] = useState({
      welcome: vs(windowHeight * 0.35),
      online: vs(windowHeight * 0.3),
      activeCompact: vs(windowHeight * 0.24),
      activeExpanded: vs(windowHeight * 0.38),
    });

    const { rideData, updateRideData } = useRideBooking();

    const [ratingVisible, setRatingVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const heightAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const transitionAnim = useRef(new Animated.Value(0)).current;
    const [isEndingTrip, setIsEndingTrip] = useState(false);
    const bottomInset = insets.bottom > 0 ? insets.bottom : vs(10);
    const [statusModal, setStatusModal] = useState<{
      visible: boolean;
      type: ModalType;
      message: string;
      title: string;
    }>({
      visible: false,
      type: "cancellation",
      message: "",
      title: "",
    });

    /* ---------------- Tray Controls ---------------- */

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

    /* ---------------- State Transitions ---------------- */

    const handleTransition = useCallback(
      (target: DriverStatus, expanded = false) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setStatus(target);
        setIsTripExpanded(expanded);

        onStatusChange?.(target);

        const stateMap = {
          welcome: 0,
          online: 1,
          active: 2,
        };

        const targetValue = stateMap[target];

        Animated.spring(transitionAnim, {
          toValue: targetValue,
          useNativeDriver: true,
          damping: 25,
          stiffness: 100,
        }).start();

        const animTargetHeight =
          target === "active" ? (expanded ? 3 : 2) : targetValue;

        Animated.spring(heightAnim, {
          toValue: animTargetHeight,
          useNativeDriver: false,
          speed: 12,
          bounciness: 4,
        }).start();
      },
      [onStatusChange, transitionAnim, heightAnim],
    );

    /* ---------------- Height Listener (Pure Output) ---------------- */

    useEffect(() => {
      const listenerId = heightAnim.addListener(({ value }) => {
        let pureHeight = tabHeights.welcome;

        if (value <= 1) {
          pureHeight =
            tabHeights.welcome +
            value * (tabHeights.online - tabHeights.welcome);
        } else if (value <= 2) {
          pureHeight =
            tabHeights.online +
            (value - 1) * (tabHeights.activeCompact - tabHeights.online);
        } else {
          pureHeight =
            tabHeights.activeCompact +
            (value - 2) *
              (tabHeights.activeExpanded - tabHeights.activeCompact);
        }

        // We emit the pure content height.
        // The parent (Map) will add the inset to its own padding.
        onHeightChange?.(pureHeight + bottomInset); // we add the bottom inset to the height
      });

      return () => heightAnim.removeListener(listenerId);
    }, [heightAnim, onHeightChange, tabHeights]);

    /* ---------------- State Resumption ---------------- */
    useEffect(() => {
      if (
        (rideData.status === "matched" ||
          rideData.status === "arrived" ||
          rideData.status === "on_trip") &&
        rideData.activeTrip &&
        status !== "active"
      ) {
        const shouldExpand =
          rideData.status === "matched" || rideData.status === "arrived";
        handleTransition("active", shouldExpand);
      }
    }, [rideData.status, rideData.activeTrip, status, handleTransition]);

    useEffect(() => {
      if (
        (rideData.status === "completed" || rideData.status === "on_rating") &&
        rideData.activeTrip &&
        !ratingVisible
      ) {
        setRatingVisible(true);
      }
    }, [rideData.status, rideData.activeTrip, ratingVisible]);

    /* ---------------- External Action Handlers ---------------- */

    useEffect(() => {
      const unsubscribeCancel = onRideCancelled((data: any) => {
        if (AppState.currentState !== "active") {
          notifyRideEvent(
            `Drift - Cancelled`,
            `Drift for ${rideData.activeTrip.passengerName || "a passenger"} has been cancelled.`,
            {
              sound: "ride_cancel.wav",
              color: theme.colors.errorNotification,
            },
          );
        }
        updateRideData({
          status: "idle",
          activeTrip: null,
          requests: [],
        });

        onMatch?.();

        handleTransition("online");

        setStatusModal({
          visible: true,
          type: "cancellation",
          title: "Drift Cancelled",
          message:
            data.reason || "The passenger has cancelled the trip request.",
        });
      });

      return () => unsubscribeCancel();
    }, [updateRideData, handleTransition, onMatch]);

    const handleTripEndedByPassenger = useCallback(
      (data: { message: string }) => {
        updateRideData({ status: "on_rating" });

        handleTransition("online");

        if (AppState.currentState !== "active") {
          notifyRideEvent(
            "Drift - Completed",
            "Thank you for riding with Drift",
            {
              sound: "trip_complete.wav",
              color: theme.colors.standardNotification,
            },
          );
        }
      },
      [updateRideData, handleTransition],
    );

    useEffect(() => {
      const unsubscribeComplete = onRideCompletedByPassenger((data) => {
        handleTripEndedByPassenger(data);
      });

      return () => {
        unsubscribeComplete();
      };
    }, [handleTripEndedByPassenger]);

    useEffect(() => {
      openTray();

      const unsubscribe = onMatchedRide((matchedData: any) => {
        const rideId = matchedData.rideId;
        const details = matchedData.tripDetails;

        updateRideData({
          requests: [],
          activeTrip: { ...details, rideId },
          status: "matched",
        });

        onMatch?.();

        if (AppState.currentState !== "active") {
          const ride = details.ride;
          const pickupAddress = ride?.pickupAddress || "Unknown";
          const tripDistance = ride?.tripDistance?.toFixed(1) ?? "N/A";
          const offerAmount = details.offer?.toFixed(2) || "N/A";
          const passengerName = details.passenger?.name || "a passenger";

          notifyRideEvent(
            `Drift - Matched`,
            `${passengerName} has selected you for a drift.\n` +
              `Pickup: ${pickupAddress}\n` +
              `Trip Distance: ${tripDistance} km\n` +
              `Fare: $${offerAmount}`,
            {
              sound: "ride_matched.wav",
              color: theme.colors.successNotification,
            },
          );
        }
        handleTransition("active", true);
      });

      return () => unsubscribe();
    }, [openTray, handleTransition, updateRideData, onMatch]);

    useImperativeHandle(ref, () => ({
      openTray,
      closeTray,
      goOnline: () => handleTransition("online"),
      startTrip: () => handleTransition("active", false),
      goOffline: () => handleTransition("welcome"),
    }));

    const handleDriverCancelTrip = async (reason: string) => {
      const rId = rideData.activeTrip?.rideId;
      const passengerPhone = rideData.activeTrip?.passenger?.phone;

      if (!rId || !passengerPhone) return;

      try {
        const userInfo = await getUserInfo();
        const phoneToCancel = passengerPhone.replace(/\D/g, "");

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
              userPhone: phoneToCancel,
              reason: reason || "No reason provided",
            }),
          },
        );

        const data = await response.json();
        if (data.success) {
          updateRideData({
            status: "idle",
            activeTrip: null,
            requests: [],
          });
          onMatch?.();
          handleTransition("online");
        }
        return data.success;
      } catch (error) {
        console.error("❌ Driver Cancel failed:", error);
        return false;
      }
    };

    const handleArrived = () => {
      const socket = getDriverSocket();
      const rId = rideData.activeTrip?.rideId;

      if (!rId) return;

      socket?.emit("ride:driver_arrived", {
        rideId: rId,
        driverPhone: rideData.activeTrip?.driver?.phone,
      });

      updateRideData({ status: "arrived" });
    };

    const handleStartTrip = () => {
      const socket = getDriverSocket();
      const rId = rideData.activeTrip?.rideId;

      if (!rId) return;

      socket?.emit("ride:start_trip", { rideId: rId });

      updateRideData({ status: "on_trip" });

      handleTransition("active", false);
    };

    const handleEndTrip = async () => {
      const rId = rideData.activeTrip?.rideId;

      if (!rId || isEndingTrip) return;

      const MAX_RETRIES = 3;
      let attempt = 0;
      let success = false;

      try {
        setIsEndingTrip(true);
        await new Promise((r) => setTimeout(r, 300));

        while (attempt < MAX_RETRIES && !success) {
          attempt++;
          try {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/driver_ends_ride`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rideId: rId }),
              },
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!result?.success) throw new Error("Server rejected request");

            updateRideData({ status: "on_rating" });
            handleTransition("online");
            success = true;
            return;
          } catch (err) {
            console.error(`❌ End trip failed (Attempt ${attempt})`, err);
            if (attempt < MAX_RETRIES)
              await new Promise((r) => setTimeout(r, 700));
          }
        }

        Alert.alert(
          "Connection Problem",
          "We could not end the trip. Please check your internet connection.",
          [{ text: "OK" }],
        );
      } finally {
        setIsEndingTrip(false);
      }
    };

    const handleRatingSubmit = async (stars: number, comment: string) => {
      const rideId = rideData.activeTrip?.rideId;
      const passengerPhone = rideData.activeTrip?.passenger?.phone;

      if (!rideId || !passengerPhone) {
        Alert.alert("Error", "Missing trip information. Please try again.");
        return;
      }

      setIsSubmitting(true);

      try {
        const success = await submitUserRating(
          "passenger",
          passengerPhone,
          rideId,
          stars,
          comment,
        );

        if (!success) {
          Alert.alert("Rating Failed", "We couldn't submit your rating.");
          return;
        }

        updateRideData({
          activeTrip: null,
          status: "idle",
        });
        setRatingVisible(false);
      } catch (error) {
        console.error("Critical rating error:", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    /* ---------------- Animations ---------------- */

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
      inputRange: [0, 1, 2, 3],
      outputRange: [
        tabHeights.welcome,
        tabHeights.online,
        tabHeights.activeCompact,
        tabHeights.activeExpanded,
      ],
    });

    /* ---------------- Render ---------------- */

    return (
      <>
        {isTripExpanded && (
          <TouchableWithoutFeedback
            onPress={() => handleTransition("active", false)}
          >
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        )}

        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
              paddingBottom: bottomInset,
            },
          ]}
        >
          <Animated.View style={{ height: currentTrayHeight, width: "100%" }}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFC"]}
              style={styles.background}
            />

            <View style={styles.contentContainer}>
              <View style={styles.tabsWrapper}>
                {/* Welcome Tab */}
                <Animated.View
                  onLayout={(e) => {
                    const height = e?.nativeEvent?.layout?.height;
                    if (height) {
                      setTabHeights((prev) => ({
                        ...prev,
                        welcome: height,
                      }));
                    }
                  }}
                  style={[
                    styles.tabContainer,
                    { transform: [{ translateX: welcomeTranslateX }] },
                  ]}
                >
                  <WelcomeTab onGoOnline={() => handleTransition("online")} />
                </Animated.View>

                {/* Online Tab */}
                <Animated.View
                  onLayout={(e) => {
                    const height = e?.nativeEvent?.layout?.height;
                    if (height) {
                      setTabHeights((prev) => ({
                        ...prev,
                        online: height,
                      }));
                    }
                  }}
                  style={[
                    styles.tabContainer,
                    { transform: [{ translateX: onlineTranslateX }] },
                  ]}
                >
                  <OnlineTab
                    onGoOffline={() => handleTransition("welcome")}
                    isOnline={isOnline}
                  />
                </Animated.View>

                {/* Active/Trip Tab */}
                <Animated.View
                  onLayout={(e) => {
                    const height = e?.nativeEvent?.layout?.height;
                    if (height) {
                      setTabHeights((prev) =>
                        isTripExpanded
                          ? { ...prev, activeExpanded: height }
                          : { ...prev, activeCompact: height },
                      );
                    }
                  }}
                  style={[
                    styles.tabContainer,
                    { transform: [{ translateX: activeTranslateX }] },
                  ]}
                >
                  <TripTab
                    onArrived={handleArrived}
                    onStartTrip={handleStartTrip}
                    onCancel={handleDriverCancelTrip}
                    onEndTrip={handleEndTrip}
                    isExpanded={isTripExpanded}
                    onToggleExpand={(val) => handleTransition("active", val)}
                  />
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
        <RatingModal
          visible={ratingVisible}
          title="Trip Completed!"
          subtitle="How was your experience with the passenger?"
          userName={rideData.activeTrip?.passenger?.name}
          userImage={rideData.activeTrip?.passenger?.profilePic}
          isLoading={isSubmitting}
          onSelectRating={handleRatingSubmit}
        />
      </>
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
    shadowOffset: { width: 0, height: vs(-4) },
    shadowOpacity: 0.15,
    shadowRadius: ms(12),
    elevation: 24,
    overflow: "hidden",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
  },
  tabsWrapper: {
    flex: 1,
  },
  tabContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});

export default DriverTray;
