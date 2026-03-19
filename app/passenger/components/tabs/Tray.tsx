import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { BackHandler, StyleSheet, View } from "react-native";
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
// Use your established responsive utility
import { hp, SCREEN_WIDTH, vs } from "@/utils/responsive";

import LocationInputTab from "./LocationInputTab";
import RideTab from "./RideTab";
import SearchingTab from "./SearchingTab";
import TripTab from "./TripTab";

/* -------------------------------- Constants -------------------------------- */

export const HEIGHTS = {
  input: hp(50), // Exactly 50% of any screen
  ride: hp(45), // Exactly 40% of any screen
  searching: hp(35), // Exactly 30% of any screen
  matched: hp(25), // Exactly 25% of any screen
  on_trip: hp(32), // Exactly 32% of any screen
  expanded: hp(40), // Exactly 40% of any screen
};

const CLOSED_HEIGHT = vs(140);

const TAB_INDEX = {
  input: 0,
  ride: 1,
  searching: 2,
  matched: 3,
  on_trip: 3,
} as const;

type TabType = keyof typeof TAB_INDEX;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 250,
  mass: 0.8,
};

const EXPANDED_SPRING_CONFIG = {
  damping: 20,
  stiffness: 150,
  mass: 0.5,
};

/* -------------------------------------------------------------------------- */
/* TAB SLIDE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

interface TabSlideProps {
  index: number;
  transitionIndex: SharedValue<number>;
  children: React.ReactNode;
}

const TabSlide = ({ index, transitionIndex, children }: TabSlideProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      transitionIndex.value,
      [0, 1, 2, 3],
      [
        SCREEN_WIDTH * index,
        SCREEN_WIDTH * (index - 1),
        SCREEN_WIDTH * (index - 2),
        SCREEN_WIDTH * (index - 3),
      ],
      Extrapolation.CLAMP,
    );

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
/* MAIN TRAY                                                                  */
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
  const [isExpanded, setIsExpanded] = useState(false);

  const transitionIndex = useSharedValue(0);
  const translateY = useSharedValue(0);
  const expandedProgress = useSharedValue(0);
  const animatedHeight = useSharedValue(HEIGHTS.input);

  const notifyTrayFinished = (h: number, isOpen: boolean) => {
    onTrayHeightChange?.(h);
    onTrayStateChange?.(isOpen);
    onTraySettled?.(true);
  };

  const animateTo = useCallback(
    (tab: TabType, expand = false) => {
      const index = TAB_INDEX[tab];
      let targetHeight = HEIGHTS[tab];

      if ((tab === "on_trip" || tab === "matched") && expand) {
        targetHeight = HEIGHTS.expanded;
      }

      animatedHeight.value = withSpring(targetHeight, SPRING_CONFIG);

      if (tab === "on_trip" || tab === "matched") {
        setIsExpanded(expand);
        expandedProgress.value = withSpring(
          expand ? 1 : 0,
          EXPANDED_SPRING_CONFIG,
        );
      } else {
        setIsExpanded(false);
        expandedProgress.value = withSpring(0, EXPANDED_SPRING_CONFIG);
      }

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
    [transitionIndex, updateRideData, expandedProgress, animatedHeight],
  );

  const openTray = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG, (finished) => {
      if (finished) {
        let height = HEIGHTS[currentTab];
        if (
          (currentTab === "on_trip" || currentTab === "matched") &&
          isExpanded
        ) {
          height = HEIGHTS.expanded;
        }
        runOnJS(notifyTrayFinished)(height, true);
      }
    });
  }, [currentTab, isExpanded, translateY]);

  const closeTray = useCallback(() => {
    let currentHeight = HEIGHTS[currentTab];
    if ((currentTab === "on_trip" || currentTab === "matched") && isExpanded) {
      currentHeight = HEIGHTS.expanded;
    }
    const target = currentHeight - CLOSED_HEIGHT;

    translateY.value = withSpring(target, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(notifyTrayFinished)(CLOSED_HEIGHT, false);
      }
    });
  }, [currentTab, isExpanded, translateY]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      height: animatedHeight.value,
      transform: [{ translateY: translateY.value }],
    };
  });

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
        updateRideData({ destination: null, status: "idle" });
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
    switchToRides: () => animateTo("ride"),
    switchToInput: () => animateTo("input"),
    switchToSearching: () => animateTo("searching"),
    switchToMatched: () => animateTo("matched"),
    switchToOnTrip: () => animateTo("on_trip"),
    toggleTripExpansion: (value: boolean) => {
      if (currentTab === "on_trip" || currentTab === "matched") {
        animateTo(currentTab, value);
      }
    },
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={["#FFFFFF", theme.colors.surface]}
        style={styles.background}
      />
      <View style={styles.contentContainer}>
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
    shadowOffset: { width: 0, height: vs(-4) },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
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
    overflow: "hidden",
  },
});

export default Tray;
