// app/passenger/components/tabs/Tray.tsx
import { LinearGradient } from "expo-linear-gradient";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
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

import { hp, SCREEN_WIDTH, vs } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";

import LocationInputTab from "./LocationInputTab";
import RideTab from "./RideTab";
import SearchingTab from "./SearchingTab";
import TripTab from "./TripTab";

/* -------------------------------- Constants -------------------------------- */

const SCREEN_HEIGHT = Dimensions.get("window").height;

export const FALLBACK_HEIGHTS = {
  input: hp(45),
  ride: hp(40),
  searching: hp(35),
  matched: hp(25),
  on_trip: hp(32),
  expanded: hp(45),
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
  const insets = useSafeAreaInsets();

  const [currentTab, setCurrentTab] = useState<TabType>("input");
  const [isExpanded, setIsExpanded] = useState(false);

  const tabHeightsRef = useRef<Record<string, number>>({});

  const transitionIndex = useSharedValue(0);
  const translateY = useSharedValue(0);
  const animatedHeight = useSharedValue(FALLBACK_HEIGHTS.input);

  const notifyTrayFinished = (h: number, isOpen: boolean) => {
    onTrayHeightChange?.(h);
    onTrayStateChange?.(isOpen);
    onTraySettled?.(true);
  };

  // -----------------------------
  // Centralized Height Handler
  // -----------------------------
  const handleContentHeight = useCallback(
    (tab: TabType, height: number) => {
      if (!height || height === tabHeightsRef.current[tab]) return;

      tabHeightsRef.current[tab] = height;

      if (currentTab === tab && !isExpanded) {
        animatedHeight.value = withSpring(height, SPRING_CONFIG);
      }
    },
    [currentTab, isExpanded, animatedHeight],
  );

  // -----------------------------
  // Animate to Tab
  // -----------------------------
  const animateTo = useCallback(
    (tab: TabType, expand = false) => {
      // Move getTargetHeight inside callback to avoid "Object is not a function"
      const getTargetHeight = (tab: TabType, expanded: boolean) => {
        if ((tab === "on_trip" || tab === "matched") && expanded) {
          return FALLBACK_HEIGHTS.expanded;
        }
        const measured = tabHeightsRef.current[tab];
        const fallback = FALLBACK_HEIGHTS[tab];
        const baseHeight = Math.max(
          200,
          Math.min(measured || fallback, SCREEN_HEIGHT * 0.92),
        );

        return baseHeight + insets.bottom;
      };

      const index = TAB_INDEX[tab];
      setCurrentTab(tab);
      setIsExpanded(expand);

      const target = getTargetHeight(tab, expand);

      animatedHeight.value = withSpring(target, SPRING_CONFIG);

      if (tab === "input") {
        updateRideData({ destination: null, vehiclePrices: {} });
      }

      transitionIndex.value = withSpring(index, SPRING_CONFIG, (finished) => {
        if (finished) runOnJS(notifyTrayFinished)(target, true);
      });
    },
    [updateRideData, animatedHeight, transitionIndex],
  );

  const openTray = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG, (finished) => {
      if (finished) {
        const getTargetHeight = (tab: TabType, expanded: boolean) => {
          if ((tab === "on_trip" || tab === "matched") && expanded) {
            return FALLBACK_HEIGHTS.expanded;
          }
          const measured = tabHeightsRef.current[tab];
          const fallback = FALLBACK_HEIGHTS[tab];
          return Math.max(
            200,
            Math.min(measured || fallback, SCREEN_HEIGHT * 0.92),
          );
        };
        const height = getTargetHeight(currentTab, isExpanded);
        runOnJS(notifyTrayFinished)(height, true);
      }
    });
  }, [currentTab, isExpanded, translateY]);

  const closeTray = useCallback(() => {
    const getTargetHeight = (tab: TabType, expanded: boolean) => {
      if ((tab === "on_trip" || tab === "matched") && expanded) {
        return FALLBACK_HEIGHTS.expanded;
      }
      const measured = tabHeightsRef.current[tab];
      const fallback = FALLBACK_HEIGHTS[tab];
      return Math.max(
        200,
        Math.min(measured || fallback, SCREEN_HEIGHT * 0.92),
      );
    };
    const currentHeight = getTargetHeight(currentTab, isExpanded);
    const target = currentHeight - CLOSED_HEIGHT;

    translateY.value = withSpring(target, SPRING_CONFIG, (finished) => {
      if (finished) runOnJS(notifyTrayFinished)(CLOSED_HEIGHT, false);
    });
  }, [currentTab, isExpanded, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    transform: [{ translateY: translateY.value }],
    paddingBottom: insets.bottom, // 👈 THIS
  }));

  // -----------------------------
  // Sync with Ride Context
  // -----------------------------
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
      case "booking":
        animateTo("ride");
        break;
    }
  }, [rideData.status, rideData.destination]);

  // -----------------------------
  // Back Button Handling
  // -----------------------------
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

  // -----------------------------
  // Imperative Handle
  // -----------------------------
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
              onContentHeight={(h) => handleContentHeight("input", h)}
              onFocus={(f) => {
                openTray();
                props.onLocationInputFocus?.(f);
              }}
            />
          </TabSlide>

          <TabSlide index={1} transitionIndex={transitionIndex}>
            <RideTab
              id={"ride"}
              onContentHeight={(h) => handleContentHeight("ride", h)}
              onOpenAdditionalInfo={onOpenAdditionalInfo || (() => {})}
              onSwitchToSearching={() => animateTo("searching")}
            />
          </TabSlide>

          <TabSlide index={2} transitionIndex={transitionIndex}>
            <SearchingTab
              onContentHeight={(h) => handleContentHeight("searching", h)}
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
              onContentHeight={(h) => handleContentHeight("on_trip", h)}
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
  background: { ...StyleSheet.absoluteFillObject },
  contentContainer: { flex: 1 },
  tabsWrapper: { flex: 1 },
});

export default Tray;
