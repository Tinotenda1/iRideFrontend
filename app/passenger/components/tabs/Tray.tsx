// app/passenger/components/tabs/Tray.tsx
import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  StyleSheet,
  View,
} from "react-native";
import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";
import LocationInputTab from "./LocationInputTab";
import RideTab from "./RideTab";
import SearchingTab from "./SearchingTab";
import TripTab from "./TripTab"; // Import the new TripTab

interface TrayProps {
  onTrayStateChange?: (open: boolean) => void;
  onTrayHeightChange?: (height: number) => void;
  onLocationInputFocus?: (field: "pickup" | "destination") => void;
  onOpenAdditionalInfo?: () => void;
  hasOffers?: boolean;
}

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT_INPUT = windowHeight * 0.5;
const OPEN_HEIGHT_RIDE = windowHeight * 0.4;
const OPEN_HEIGHT_SEARCHING = windowHeight * 0.3;
const OPEN_HEIGHT_MATCHED = windowHeight * 0.25; // Adjusted slightly for Bolt style (approx 0.28 of screen)
const CLOSED_HEIGHT = 140;

const Tray = forwardRef<any, TrayProps>(
  (
    {
      onTrayStateChange,
      onTrayHeightChange,
      onLocationInputFocus,
      onOpenAdditionalInfo,
      hasOffers,
    },
    ref,
  ) => {
    const { setCurrentRide } = useRideBooking();
    const { rideData, updateRideData } = useRideBooking();
    // Add 'matched' to the tab type
    const [currentTab, setCurrentTab] = useState<
      "input" | "ride" | "searching" | "matched"
    >("input");

    const heightAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(
      new Animated.Value(OPEN_HEIGHT_INPUT - CLOSED_HEIGHT),
    ).current;
    const transitionAnim = useRef(new Animated.Value(0)).current;

    // MONITOR RIDE STATUS: Auto-transition to TripTab when matched
    useEffect(() => {
      if (rideData.status === "matched" && currentTab !== "matched") {
        handleTransition("matched");
      } else if (rideData.status === "idle" && currentTab === "matched") {
        handleTransition("input");
      }
    }, [rideData.status]);

    useEffect(() => {
      handleTransition("input");
      openTray();
    }, []);

    useEffect(() => {
      const backAction = () => {
        if (currentTab === "ride") {
          updateRideData({ destination: null });
          handleTransition("input");
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, [currentTab, updateRideData]);

    useEffect(() => {
      if (rideData.pickupLocation && rideData.destination) {
        fetchPricingSuggestions();
      }
    }, [rideData.pickupLocation, rideData.destination]);

    const fetchPricingSuggestions = async () => {
      if (!rideData.pickupLocation || !rideData.destination) return;
      try {
        const payload = {
          pickup: {
            latitude: rideData.pickupLocation.latitude,
            longitude: rideData.pickupLocation.longitude,
          },
          destination: {
            latitude: rideData.destination.latitude,
            longitude: rideData.destination.longitude,
          },
        };
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/pricing/suggest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await response.json();
        const prices: Record<string, number> = {};
        data.suggestions.forEach((item: any) => {
          prices[item.vehicleType] = item.suggestedPrice;
        });
        updateRideData({ vehiclePrices: prices });
      } catch (error) {
        console.error("❌ Error fetching pricing:", error);
      }
    };

    useImperativeHandle(ref, () => ({
      openTray,
      closeTray,
      switchToRides: () => handleTransition("ride"),
      switchToInput: () => handleTransition("input"),
      switchToSearching: () => handleTransition("searching"),
      switchToMatched: () => handleTransition("matched"),
    }));

    // Inside Tray.tsx

    // Inside Tray.tsx - Updated handleTransition

    const handleTransition = (
      target: "input" | "ride" | "searching" | "matched",
    ) => {
      setCurrentTab(target);

      if (target === "input") {
        // 🧹 CRITICAL: Clear everything so the next trip starts fresh
        updateRideData({
          status: "idle",
          destination: null,
          vehiclePrices: {},
        });
        setCurrentRide(null); // This clears the driver/vehicle from TripTab
      }

      // ✅ NEW: Update global status based on the tab transition
      if (target === "searching") {
        updateRideData({ status: "searching" });
      } else if (target === "matched") {
        updateRideData({ status: "matched" });
      } else if (target === "ride") {
        // This is the "Setup/Booking" phase where the card IS alive
        updateRideData({ status: "idle" });
      }

      // Ensure the height change is sent to the parent immediately
      const heights = {
        input: OPEN_HEIGHT_INPUT,
        ride: OPEN_HEIGHT_RIDE,
        searching: OPEN_HEIGHT_SEARCHING,
        matched: OPEN_HEIGHT_MATCHED,
      };
      onTrayHeightChange?.(heights[target]);

      let transitionValue = 0;
      let heightValue = 0;

      if (target === "input") {
        transitionValue = 0;
        heightValue = 0;
      } else if (target === "ride") {
        transitionValue = 1;
        heightValue = 1;
      } else if (target === "searching") {
        transitionValue = 2;
        heightValue = 2;
      } else if (target === "matched") {
        transitionValue = 3;
        heightValue = 3;
      }

      Animated.parallel([
        Animated.spring(transitionAnim, {
          toValue: transitionValue,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.spring(heightAnim, {
          toValue: heightValue,
          useNativeDriver: false,
        }),
      ]).start();
    };

    const openTray = () => {
      onTrayStateChange?.(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        tension: 50,
        friction: 9,
      }).start();

      const heights = {
        input: OPEN_HEIGHT_INPUT,
        ride: OPEN_HEIGHT_RIDE,
        searching: OPEN_HEIGHT_SEARCHING,
        matched: OPEN_HEIGHT_MATCHED,
      };
      // ✅ Fix: Use currentTab here, not 'target'
      onTrayHeightChange?.(heights[currentTab]);
    };

    const closeTray = () => {
      onTrayStateChange?.(false);
      const heights = {
        input: OPEN_HEIGHT_INPUT,
        ride: OPEN_HEIGHT_RIDE,
        searching: OPEN_HEIGHT_SEARCHING,
        matched: OPEN_HEIGHT_MATCHED,
      };
      Animated.spring(translateY, {
        toValue: heights[currentTab] - CLOSED_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 9,
      }).start();
      onTrayHeightChange?.(CLOSED_HEIGHT);
    };

    const inputTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [0, -windowWidth, -windowWidth * 2, -windowWidth * 3],
    });

    const rideTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [windowWidth, 0, -windowWidth, -windowWidth * 2],
    });

    const searchingTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [windowWidth * 2, windowWidth, 0, -windowWidth],
    });

    const matchedTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [windowWidth * 3, windowWidth * 2, windowWidth, 0],
    });

    const currentTrayHeight = heightAnim.interpolate({
      inputRange: [0, 1, 2, 3],
      outputRange: [
        OPEN_HEIGHT_INPUT,
        OPEN_HEIGHT_RIDE,
        OPEN_HEIGHT_SEARCHING,
        OPEN_HEIGHT_MATCHED,
      ],
    });

    return (
      <Animated.View
        style={[
          styles.container,
          { height: currentTrayHeight, transform: [{ translateY }] },
        ]}
      >
        <LinearGradient
          colors={["#FFFFFF", theme.colors.surface]}
          style={styles.background}
        />
        <View style={styles.contentContainer}>
          <View style={styles.tabsWrapper}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: inputTranslateX }] },
              ]}
            >
              <LocationInputTab
                onFocus={(field) => {
                  openTray();
                  onLocationInputFocus?.(field);
                }}
              />
            </Animated.View>

            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: rideTranslateX }] },
              ]}
            >
              <RideTab
                id="ride-options"
                onOpenAdditionalInfo={onOpenAdditionalInfo || (() => {})}
                onSwitchToSearching={() => handleTransition("searching")}
              />
            </Animated.View>

            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: searchingTranslateX }] },
              ]}
            >
              <SearchingTab
                isActive={
                  currentTab === "searching" && rideData.status !== "matched"
                }
                onCancel={() => {
                  updateRideData({ destination: null });
                  handleTransition("input");
                }}
                onBackToRide={() => handleTransition("ride")}
                hasOffers={!!hasOffers}
              />
            </Animated.View>

            {/* New Trip Tab Transition */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: matchedTranslateX }] },
              ]}
            >
              <TripTab onCancel={() => handleTransition("input")} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    );
  },
);

Tray.displayName = "Tray";

const styles = createStyles({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: theme.borderRadius.xl * 1.5,
    borderTopRightRadius: theme.borderRadius.xl * 1.5,
  },
  contentContainer: { flex: 1, paddingTop: theme.spacing.md },
  tabsWrapper: { flex: 1, overflow: "hidden" },
});

export default Tray;
