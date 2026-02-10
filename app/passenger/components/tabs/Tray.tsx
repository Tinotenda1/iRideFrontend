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
import TripTab from "./TripTab";

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
const OPEN_HEIGHT_MATCHED = windowHeight * 0.25;
const OPEN_HEIGHT_ON_TRIP = windowHeight * 0.32;
const OPEN_HEIGHT_ON_TRIP_EXPANDED = windowHeight * 0.4;
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
    const { rideData, updateRideData } = useRideBooking();

    // ✅ Initial state is now dynamic based on context, but defaulting to input
    const [currentTab, setCurrentTab] = useState<
      "input" | "ride" | "searching" | "matched" | "on_trip"
    >("input");

    const heightAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(
      new Animated.Value(OPEN_HEIGHT_INPUT - CLOSED_HEIGHT),
    ).current;
    const transitionAnim = useRef(new Animated.Value(0)).current;

    // --- MONITOR CONTEXT STATUS ---
    // If context changes (e.g. server updates status), update the tab
    useEffect(() => {
      if (rideData.status === "on_trip" && currentTab !== "on_trip") {
        handleTransition("on_trip");
      } else if (
        (rideData.status === "matched" || rideData.status === "arrived") &&
        currentTab !== "matched" &&
        currentTab !== "on_trip"
      ) {
        handleTransition("matched");
      } else if (
        rideData.status === "idle" &&
        (currentTab === "matched" ||
          currentTab === "on_trip" ||
          currentTab === "searching")
      ) {
        handleTransition("input");
      }
    }, [rideData.status]);

    // --- MOUNT LOGIC (Session Restoration) ---
    useEffect(() => {
      // ✅ "Ride-Aware" Mount: Check context to determine initial state
      const restoredStatus = rideData.status;

      if (restoredStatus === "matched" || restoredStatus === "arrived") {
        handleTransition("matched");
      } else if (restoredStatus === "on_trip") {
        handleTransition("on_trip");
      } else if (restoredStatus === "searching") {
        handleTransition("searching");
      } else if (rideData.destination) {
        handleTransition("ride");
      } else {
        handleTransition("input");
      }

      openTray();
    }, []); // Runs once on mount

    // Hardware Back Button Handler
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

    // --- IMPERATIVE API ---
    useImperativeHandle(ref, () => ({
      openTray,
      closeTray,
      switchToRides: () => handleTransition("ride"),
      switchToInput: () => handleTransition("input"),
      switchToSearching: () => handleTransition("searching"),
      switchToMatched: () => handleTransition("matched"),
      switchToOnTrip: () => handleTransition("on_trip"),
      toggleTripExpansion: (isExpanded: boolean) => {
        const targetHeight = isExpanded
          ? OPEN_HEIGHT_ON_TRIP_EXPANDED
          : OPEN_HEIGHT_ON_TRIP;
        onTrayHeightChange?.(targetHeight);
        Animated.spring(heightAnim, {
          toValue: isExpanded ? 5 : 4,
          useNativeDriver: false,
        }).start();
      },
    }));

    // --- TRANSITION LOGIC ---
    const handleTransition = (
      target: "input" | "ride" | "searching" | "matched" | "on_trip",
    ) => {
      setCurrentTab(target);

      // ✅ GUARD: Only update context if state is actually changing
      if (target === "input" && rideData.status !== "idle") {
        updateRideData({
          status: "idle",
          destination: null,
          vehiclePrices: {},
        });
      } else if (target === "searching" && rideData.status !== "searching") {
        updateRideData({ status: "searching" });
      } else if (target === "matched" && rideData.status !== "matched") {
        updateRideData({ status: "matched" });
      } else if (target === "on_trip" && rideData.status !== "on_trip") {
        updateRideData({ status: "on_trip" });
      }

      // 1. Update Layout Heights
      const heights = {
        input: OPEN_HEIGHT_INPUT,
        ride: OPEN_HEIGHT_RIDE,
        searching: OPEN_HEIGHT_SEARCHING,
        matched: OPEN_HEIGHT_MATCHED,
        on_trip: OPEN_HEIGHT_ON_TRIP,
      };

      // If we are moving to or staying in on_trip, check if we were expanded
      const isExpandedState = (heightAnim as any)._value === 5; // Using the cast to satisfy compiler

      if (target === "on_trip" && isExpandedState) {
        onTrayHeightChange?.(OPEN_HEIGHT_ON_TRIP_EXPANDED);
      } else {
        onTrayHeightChange?.(heights[target as keyof typeof heights]);
      }
      // 2. Determine Animation State Index
      let stateValue = 0;
      if (target === "input") stateValue = 0;
      else if (target === "ride") stateValue = 1;
      else if (target === "searching") stateValue = 2;
      else if (target === "matched") stateValue = 3;
      else if (target === "on_trip") stateValue = 4;

      // 3. Animate Transition
      Animated.parallel([
        Animated.spring(transitionAnim, {
          toValue: stateValue,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }),
        Animated.spring(heightAnim, {
          toValue: stateValue,
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
        on_trip: OPEN_HEIGHT_ON_TRIP,
      };
      onTrayHeightChange?.(heights[currentTab]);
    };

    const closeTray = () => {
      onTrayStateChange?.(false);
      const heights = {
        input: OPEN_HEIGHT_INPUT,
        ride: OPEN_HEIGHT_RIDE,
        searching: OPEN_HEIGHT_SEARCHING,
        matched: OPEN_HEIGHT_MATCHED,
        on_trip: OPEN_HEIGHT_ON_TRIP,
      };
      Animated.spring(translateY, {
        toValue: heights[currentTab] - CLOSED_HEIGHT,
        useNativeDriver: false,
        tension: 50,
        friction: 9,
      }).start();
      onTrayHeightChange?.(CLOSED_HEIGHT);
    };

    // --- INTERPOLATIONS ---
    const inputTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4],
      outputRange: [
        0,
        -windowWidth,
        -windowWidth * 2,
        -windowWidth * 3,
        -windowWidth * 4,
      ],
    });

    const rideTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4],
      outputRange: [
        windowWidth,
        0,
        -windowWidth,
        -windowWidth * 2,
        -windowWidth * 3,
      ],
    });

    const searchingTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4],
      outputRange: [
        windowWidth * 2,
        windowWidth,
        0,
        -windowWidth,
        -windowWidth * 2,
      ],
    });

    const matchedTranslateX = transitionAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4, 5],
      outputRange: [windowWidth * 3, windowWidth * 2, windowWidth, 0, 0, 0],
    });

    const currentTrayHeight = heightAnim.interpolate({
      inputRange: [0, 1, 2, 3, 4, 5],
      outputRange: [
        OPEN_HEIGHT_INPUT,
        OPEN_HEIGHT_RIDE,
        OPEN_HEIGHT_SEARCHING,
        OPEN_HEIGHT_MATCHED,
        OPEN_HEIGHT_ON_TRIP,
        OPEN_HEIGHT_ON_TRIP_EXPANDED,
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
                isActive={currentTab === "searching"}
                onCancel={() => {
                  updateRideData({ destination: null });
                  handleTransition("input");
                }}
                onBackToRide={() => handleTransition("ride")}
                hasOffers={!!hasOffers}
              />
            </Animated.View>

            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: matchedTranslateX }] },
              ]}
            >
              <TripTab
                onCancel={() => handleTransition("input")}
                onExpand={(isExpanded) => {
                  const targetHeight = isExpanded
                    ? OPEN_HEIGHT_ON_TRIP_EXPANDED
                    : OPEN_HEIGHT_ON_TRIP;
                  onTrayHeightChange?.(targetHeight);
                  Animated.spring(heightAnim, {
                    toValue: isExpanded ? 5 : 4,
                    useNativeDriver: false,
                    tension: 40,
                    friction: 8,
                  }).start();
                }}
              />
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
