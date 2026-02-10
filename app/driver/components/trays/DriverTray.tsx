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
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from "react-native";

import RatingModal from "../../../../components/RatingModal";
import { submitUserRating } from "../../../../utils/ratingSubmittion";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";

import {
  getDriverSocket,
  onMatchedRide,
  onRideCancelled,
  onRideCompletedByPassenger,
} from "../../socketConnectionUtility/driverSocketService";

import { getUserInfo } from "@/utils/storage";
import TripStatusModal, {
  ModalType,
} from "../../../../components/TripStatusModal";
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
const HEIGHT_ACTIVE_COMPACT = windowHeight * 0.2;
const HEIGHT_ACTIVE_EXPANDED = windowHeight * 0.38;

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DriverTray = forwardRef<any, DriverTrayProps>(
  ({ onStatusChange, onHeightChange, onMatch }, ref) => {
    const [status, setStatus] = useState<DriverStatus>("welcome");
    const [isTripExpanded, setIsTripExpanded] = useState(false);

    const { rideData, updateRideData } = useRideBooking();

    const [ratingVisible, setRatingVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Added loading state
    const heightAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const transitionAnim = useRef(new Animated.Value(0)).current;
    const [statusModal, setStatusModal] = useState<{
      visible: boolean;
      type: ModalType; // Use the specific union type here
      message: string;
      title: string;
    }>({
      visible: false,
      type: "cancellation", // Default to a valid ModalType
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

    /* ---------------- Height Listener ---------------- */

    useEffect(() => {
      const listenerId = heightAnim.addListener(({ value }) => {
        let actualHeight = HEIGHT_WELCOME;

        if (value <= 1) {
          actualHeight =
            HEIGHT_WELCOME + value * (HEIGHT_ONLINE - HEIGHT_WELCOME);
        } else if (value <= 2) {
          actualHeight =
            HEIGHT_ONLINE +
            (value - 1) * (HEIGHT_ACTIVE_COMPACT - HEIGHT_ONLINE);
        } else {
          actualHeight =
            HEIGHT_ACTIVE_COMPACT +
            (value - 2) * (HEIGHT_ACTIVE_EXPANDED - HEIGHT_ACTIVE_COMPACT);
        }

        onHeightChange?.(actualHeight);
      });

      return () => heightAnim.removeListener(listenerId);
    }, [heightAnim, onHeightChange]);

    /* ---------------- State Resumption ---------------- */
    useEffect(() => {
      // Check if we have an active trip but the tray is not in "active" status
      // This handles the resumption when checkExistingState finishes
      if (
        (rideData.status === "matched" ||
          rideData.status === "arrived" ||
          rideData.status === "on_trip") &&
        rideData.activeTrip &&
        status !== "active"
      ) {
        // If it's a fresh resumption, we might want it expanded to show the passenger
        const shouldExpand = rideData.status === "matched";
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

    /* ---------------- Cancellation Listener ---------------- */
    useEffect(() => {
      const unsubscribeCancel = onRideCancelled((data: any) => {
        // 1. Reset Global Ride Context
        updateRideData({
          status: "idle",
          activeTrip: null,
          requests: [],
        });

        // 2. Clear local tray/dashboard states via the callback
        onMatch?.();

        // 3. Move Tray back to Online radar
        handleTransition("online");

        // 4. Show the Cancellation Modal
        setStatusModal({
          visible: true,
          type: "cancellation",
          title: "Trip Cancelled",
          message:
            data.reason || "The passenger has cancelled the trip request.",
        });
      });

      return () => unsubscribeCancel();
    }, [updateRideData, handleTransition, onMatch]);

    const handleTripEndedByPassenger = useCallback(
      (data: { message: string }) => {
        // 1. Move UI back to online/idle state
        // We keep activeTrip data so the RatingModal can access passenger info
        updateRideData({ status: "on_rating" });

        handleTransition("online");

        // 2. Show the "Completion" Modal
        setStatusModal({
          visible: true,
          type: "completion",
          title: "Trip Finished",
          message:
            data.message ||
            "The passenger ended the trip. Please rate your experience.",
        });
      },
      [updateRideData, handleTransition],
    );

    /* ---------------- Socket Listeners ---------------- */

    useEffect(() => {
      // Listen for Completion (Passenger clicked "Drop me here")
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

        handleTransition("active", true);
      });

      return () => unsubscribe();
    }, [openTray, handleTransition, updateRideData, onMatch]);

    /* ---------------- Ref API ---------------- */

    useImperativeHandle(ref, () => ({
      openTray,
      closeTray,
      goOnline: () => handleTransition("online"),
      startTrip: () => handleTransition("active", false),
      goOffline: () => handleTransition("welcome"),
    }));

    /* ---------------- Trip Actions ---------------- */

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
          onMatch?.(); // Clear dashboard states
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

      if (!rId) return;

      try {
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/driver_ends_ride`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rideId: rId }),
          },
        );

        const result = await response.json();

        if (result.success) {
          updateRideData({ status: "on_rating" });

          handleTransition("online");
        }
      } catch (error) {
        console.error(error);
      }
    };

    const handleRatingSubmit = async (stars: number, comment: string) => {
      const rideId = rideData.activeTrip?.rideId;
      const passengerPhone = rideData.activeTrip?.passenger?.phone;

      if (!rideId || !passengerPhone) {
        Alert.alert("Error", "Missing trip information. Please try again.");
        return;
      }

      setIsSubmitting(true); // ✅ Implementation of loading state

      try {
        const success = await submitUserRating(
          "passenger",
          passengerPhone,
          rideId,
          stars,
          comment,
        );

        if (!success) {
          // ✅ SAFEGUARD: Alert user and STOP execution
          Alert.alert(
            "Rating Failed",
            "We couldn't submit your rating for the passenger. Please try again.",
            [{ text: "OK" }],
          );
          // We don't clear the activeTrip or close modal, allowing a retry
          return;
        }

        // ✅ Success: Cleanup and reset
        updateRideData({
          activeTrip: null,
          status: "idle",
        });
        setRatingVisible(false);
      } catch (error) {
        console.error("Critical rating error (driver side):", error);
        Alert.alert("Error", "An unexpected error occurred while rating.");
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
        HEIGHT_WELCOME,
        HEIGHT_ONLINE,
        HEIGHT_ACTIVE_COMPACT,
        HEIGHT_ACTIVE_EXPANDED,
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
          style={[styles.container, { transform: [{ translateY }] }]}
        >
          <Animated.View style={{ height: currentTrayHeight, width: "100%" }}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFC"]}
              style={styles.background}
            />

            <View style={styles.contentContainer}>
              <View style={styles.tabsWrapper}>
                {/* Welcome */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateX: welcomeTranslateX }] },
                  ]}
                >
                  <WelcomeTab onGoOnline={() => handleTransition("online")} />
                </Animated.View>

                {/* Online */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateX: onlineTranslateX }] },
                  ]}
                >
                  <OnlineTab onGoOffline={() => handleTransition("welcome")} />
                </Animated.View>

                {/* Active */}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
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
                <TripStatusModal
                  visible={statusModal.visible}
                  type={statusModal.type}
                  title={statusModal.title}
                  message={statusModal.message}
                  onClose={() => {
                    setStatusModal((prev) => ({ ...prev, visible: false }));
                  }}
                />
                <RatingModal
                  visible={ratingVisible}
                  title="Rate Your Passenger"
                  userName={rideData.activeTrip?.passenger?.name}
                  userImage={rideData.activeTrip?.passenger?.profilePic}
                  subtitle="Your feedback helps keep the community safe."
                  onSelectRating={handleRatingSubmit}
                  isLoading={isSubmitting}
                />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
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
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
});

export default DriverTray;
