import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { BackHandler, Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";

import LocationInputTab from "./LocationInputTab";
import RideTab from "./RideTab";
import SearchingTab from "./SearchingTab";
import TripTab from "./TripTab";

/* -------------------------------- Constants -------------------------------- */

const { width, height: screenHeight } = Dimensions.get("window");

const HEIGHTS = {
  input: screenHeight * 0.5,
  ride: screenHeight * 0.4,
  searching: screenHeight * 0.3,
  matched: screenHeight * 0.25,
  on_trip: screenHeight * 0.32,
  expanded: screenHeight * 0.4,
};

const CLOSED_HEIGHT = 140;

const TAB_INDEX = {
  input: 0,
  ride: 1,
  searching: 2,
  matched: 3,
  on_trip: 4,
  expanded: 5,
} as const;

type TabType = keyof typeof TAB_INDEX;

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 1,
};

/* -------------------------------------------------------------------------- */
/* NEW SUB-COMPONENT TO SOLVE ESLINT HOOK RULE                    */
/* -------------------------------------------------------------------------- */

interface TabSlideProps {
  index: number;
  transitionIndex: SharedValue<number>;
  children: React.ReactNode;
}

const TabSlide = ({ index, transitionIndex, children }: TabSlideProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    // Horizontal sliding logic
    const translateX = interpolate(
      transitionIndex.value,
      [0, 1, 2, 3, 4],
      [
        width * index,
        width * (index - 1),
        width * (index - 2),
        width * (index - 3),
        width * (index - 4),
      ],
    );

    // Subtle fade for that premium transition
    const opacity = interpolate(
      transitionIndex.value,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN TRAY                                   */
/* -------------------------------------------------------------------------- */

const Tray = forwardRef<any, any>((props, ref) => {
  const {
    onTrayStateChange,
    onTrayHeightChange,
    onLocationInputFocus,
    onOpenAdditionalInfo,
    hasOffers,
    onClearOffers,
    onTraySettled,
  } = props;

  const { rideData, updateRideData } = useRideBooking();
  const [currentTab, setCurrentTab] = useState<TabType>("input");

  const transitionIndex = useSharedValue(0);
  const translateY = useSharedValue(0);

  const notifyTrayFinished = (h: number, isOpen: boolean) => {
    onTrayHeightChange?.(h);
    onTrayStateChange?.(isOpen);
    onTraySettled?.(true);
  };

  const animateTo = useCallback(
    (tab: TabType, isExpanded = false) => {
      const index = isExpanded ? TAB_INDEX.expanded : TAB_INDEX[tab];
      const targetHeight =
        isExpanded && tab === "on_trip" ? HEIGHTS.expanded : HEIGHTS[tab];

      // ✅ ADDED: Logic to clear destination whenever returning to input
      if (tab === "input") {
        updateRideData({ destination: null, vehiclePrices: {} });
      }

      setCurrentTab(tab);

      transitionIndex.value = withSpring(index, SPRING_CONFIG, (finished) => {
        if (finished) {
          runOnJS(notifyTrayFinished)(targetHeight, true);
        }
      });
    },
    [transitionIndex, updateRideData], // Added updateRideData to dependencies
  );

  const openTray = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(notifyTrayFinished)(HEIGHTS[currentTab], true);
      }
    });
  }, [currentTab, translateY]);

  const closeTray = useCallback(() => {
    const target = HEIGHTS[currentTab] - CLOSED_HEIGHT;
    translateY.value = withSpring(target, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(notifyTrayFinished)(CLOSED_HEIGHT, false);
      }
    });
  }, [currentTab, translateY]);

  const containerStyle = useAnimatedStyle(() => {
    const currentHeight = interpolate(
      transitionIndex.value,
      [0, 1, 2, 3, 4, 5],
      [
        HEIGHTS.input,
        HEIGHTS.ride,
        HEIGHTS.searching,
        HEIGHTS.matched,
        HEIGHTS.on_trip,
        HEIGHTS.expanded,
      ],
      Extrapolation.CLAMP,
    );

    return {
      height: currentHeight,
      transform: [{ translateY: translateY.value }],
    };
  });

  /* -------------------------- Lifecycle Sync ----------------------------- */

  useEffect(() => {
    if (!rideData.destination) {
      animateTo("input");
      return;
    }
    switch (rideData.status) {
      case "searching":
        animateTo("searching");
        break;
      case "matched":
      case "arrived":
        animateTo("matched");
        break;
      case "on_trip":
        animateTo("on_trip");
        break;
      default:
        break;
    }
  }, [rideData.status, rideData.destination, animateTo]);

  useEffect(() => {
    const handler = () => {
      if (currentTab === "ride") {
        updateRideData({ destination: null });
        animateTo("input");
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [currentTab, animateTo, updateRideData]);

  useImperativeHandle(ref, () => ({
    openTray,
    //closeTray,
    switchToRides: () => animateTo("ride"),
    switchToInput: () => animateTo("input"),
    switchToSearching: () => animateTo("searching"),
    switchToMatched: () => animateTo("matched"),
    switchToOnTrip: () => animateTo("on_trip"),
    toggleTripExpansion: (value: boolean) => {
      if (currentTab === "on_trip") animateTo("on_trip", value);
    },
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={["#FFFFFF", theme.colors.surface]}
        style={styles.background}
      />

      <View style={styles.contentContainer}>
        <View style={styles.handle} />

        <View style={styles.tabsWrapper}>
          <TabSlide index={0} transitionIndex={transitionIndex}>
            <LocationInputTab
              onFocus={(f) => {
                openTray();
                onLocationInputFocus?.(f);
              }}
            />
          </TabSlide>

          <TabSlide index={1} transitionIndex={transitionIndex}>
            <RideTab
              id="ride-options"
              onOpenAdditionalInfo={onOpenAdditionalInfo || (() => {})}
              onSwitchToSearching={() => animateTo("searching")}
            />
          </TabSlide>

          <TabSlide index={2} transitionIndex={transitionIndex}>
            <SearchingTab
              isActive={currentTab === "searching"}
              hasOffers={!!hasOffers}
              onClearOffers={onClearOffers}
              onCancel={() => {
                updateRideData({ destination: null });
                animateTo("input");
              }}
              onBackToRide={() => animateTo("ride")}
            />
          </TabSlide>

          <TabSlide index={3} transitionIndex={transitionIndex}>
            <TripTab
              onCancel={() => animateTo("input")}
              onExpand={(v) => animateTo("on_trip", v)}
            />
          </TabSlide>
        </View>
      </View>
    </Animated.View>
  );
});

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
    overflow: "hidden",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: theme.colors.border,
    //borderRadius: 0,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
    opacity: 0.5,
  },
  contentContainer: {
    flex: 1,
  },
  tabsWrapper: {
    flex: 1,
    overflow: "hidden",
  },
});

export default Tray;
