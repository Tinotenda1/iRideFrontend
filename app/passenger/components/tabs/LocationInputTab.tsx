// app/passenger/components/tabs/LocationInputTab.tsx

import * as Location from "expo-location"; // Ensure this is installed
import { Clock, Navigation, Search, Star, Trash2 } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  Alert,
  BackHandler,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";
import { Place } from "../map/LocationSearch";

/* =====================================================
    Elastic Swipe Item (No Spring)
===================================================== */
const SWIPE_TRIGGER = -70;
const ELASTIC_FACTOR = 0.35;

interface SwipeItemProps {
  item: Place;
  index: number;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
}

const SwipeableDestinationItem: React.FC<SwipeItemProps> = ({
  item,
  index,
  isLast,
  onPress,
  onDelete,
}) => {
  const translateX = useSharedValue(0);
  const isArmed = useSharedValue(false);

  const reset = () => {
    isArmed.value = false;
    translateX.value = withTiming(0, { duration: 180 });
  };

  useEffect(() => {
    const backAction = () => {
      if (isArmed.value) {
        reset();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => sub.remove();
  }, []);

  const onGestureEvent = (e: any) => {
    const x = e.nativeEvent.translationX;
    if (x < 0) translateX.value = x * ELASTIC_FACTOR;
  };

  const onEnd = () => {
    if (translateX.value < SWIPE_TRIGGER * ELASTIC_FACTOR) {
      isArmed.value = true;
    }
    translateX.value = withTiming(0, { duration: 180 });
  };

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: isArmed.value ? 1 : 0,
    transform: [
      { scale: withTiming(isArmed.value ? 1 : 0.8, { duration: 150 }) },
    ],
  }));

  return (
    <View style={{ position: "relative" }}>
      <Animated.View style={[styles.elasticDelete, deleteStyle]}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Remove Destination", item.name, [
              { text: "Cancel", style: "cancel", onPress: reset },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
        >
          <Trash2 size={16} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <PanGestureHandler onGestureEvent={onGestureEvent} onEnded={onEnd}>
        <Animated.View style={rowStyle}>
          <TouchableOpacity
            style={[styles.suggestionItem, isLast && styles.noBorder]}
            activeOpacity={0.85}
            onPress={() => {
              if (!isArmed.value) onPress();
            }}
          >
            <View style={styles.iconCircle}>
              {index === 0 ? (
                <Star size={18} color={theme.colors.textSecondary} />
              ) : (
                <Clock size={18} color={theme.colors.textSecondary} />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.placeName}>{item.name}</Text>
              <Text style={styles.placeAddress} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
            <Navigation size={16} color={theme.colors.border} />
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

/* =====================================================
    Main Component
===================================================== */
interface LocationInputTabProps {
  onFocus?: (field: "pickup" | "destination") => void;
  onSuggestionSelect?: (place: Place) => void;
}

const LocationInputTab: React.FC<LocationInputTabProps> = ({
  onFocus,
  onSuggestionSelect,
}) => {
  const {
    rideData,
    updateRideData,
    loading,
    hideRecentDestination,
    fetchPrices,
  } = useRideBooking();

  // 1. Auto-set Pickup to Current Location AND Clear Destination on mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      let location = await Location.getCurrentPositionAsync({});
      let reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const currentPlace: Place = {
        id: "current",
        name: "Current Location",
        address: reverse[0]
          ? `${reverse[0].name || ""} ${reverse[0].street || ""}`.trim()
          : "Current Location",
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      updateRideData({ pickupLocation: currentPlace });
    })();
  }, []);

  // 2. Fetch prices when destination is selected (and pickup exists)
  // 2. Trigger fetch prices
  useEffect(() => {
    if (rideData.pickupLocation?.latitude && rideData.destination?.latitude) {
      fetchPrices(rideData.pickupLocation, rideData.destination);
    }
  }, [rideData.destination, rideData.pickupLocation]);

  // ✅ 3. Log prices in the Tab whenever they are updated in context
  useEffect(() => {
    if (
      rideData.vehiclePrices &&
      Object.keys(rideData.vehiclePrices).length > 0
    ) {
      console.log("[RideTab] Received updated prices:", rideData.vehiclePrices);
    }
  }, [rideData.vehiclePrices]);

  const handleSelect = (
    field: "pickup" | "destination",
    place: Place | null,
  ) => {
    updateRideData({ [field]: place });
    console.log(`[RideTab] ${field} set to:`, place);
    if (field === "destination" && place) {
      onSuggestionSelect?.(place);
    }
  };

  const recentDestinations = rideData.recentDestinations || [];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.inputSection}>
          <View style={styles.lineDecorator}>
            <View style={styles.dotPickup} />
            <View style={styles.line} />
            <View style={styles.squareDestination} />
          </View>

          <View style={styles.fieldsWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Pickup location"
                placeholderTextColor={theme.colors.textSecondary}
                value={rideData.pickupLocation?.name || ""}
                onFocus={() => onFocus?.("pickup")}
              />
            </View>
            <View style={styles.inputSeparator} />
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.textInput, { fontWeight: "600" }]}
                placeholder="Where to?"
                placeholderTextColor={theme.colors.textSecondary}
                value={rideData.destination?.name || ""}
                onFocus={() => onFocus?.("destination")}
              />
              <Search
                size={18}
                color={theme.colors.textSecondary}
                style={styles.searchIcon}
              />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.suggestionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ PREMIUM HIDE HEADING IF NO DATA/NETWORK */}
          {recentDestinations.length > 0 && (
            <Text style={styles.sectionTitle}>Recent Destinations</Text>
          )}

          {loading && recentDestinations.length === 0 ? (
            <View style={styles.loaderContainer}></View>
          ) : recentDestinations.length > 0 ? (
            recentDestinations.map((item: Place, index: number) => (
              <SwipeableDestinationItem
                key={item.id || `recent-${index}`}
                item={item}
                index={index}
                isLast={index === recentDestinations.length - 1}
                onPress={() => handleSelect("destination", item)}
                onDelete={() => hideRecentDestination(item.id || "")}
              />
            ))
          ) : (
            /* ✅ PREMIUM OFFLINE / EMPTY STATE - Now takes full prominence */
            <View style={styles.errorContainer}>
              <View style={styles.errorIconCircle}>
                <View style={styles.statusDot} />
                <Navigation
                  size={20}
                  color={theme.colors.textSecondary + "80"}
                />
              </View>
              <Text style={styles.errorText}>
                Network connection unavailable
              </Text>
              <Text style={styles.errorSubtext}>
                Check your settings to see recent places
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = createStyles({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  scrollContainer: { flex: 1 },
  inputSection: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  lineDecorator: {
    alignItems: "center",
    width: 20,
    marginVertical: 15,
    marginRight: theme.spacing.sm,
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  squareDestination: { width: 8, height: 8, backgroundColor: "#d34444ff" },
  fieldsWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
  },
  inputContainer: { height: 50, flexDirection: "row", alignItems: "center" },
  textInput: { flex: 1, fontSize: 15, color: theme.colors.text },
  inputSeparator: { height: 1, backgroundColor: theme.colors.border + "50" },
  searchIcon: { marginLeft: theme.spacing.xs },
  suggestionsContainer: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + "30",
    backgroundColor: theme.colors.surface,
  },
  noBorder: { borderBottomWidth: 0 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  textContainer: { flex: 1 },
  placeName: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  placeAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  loaderContainer: { paddingVertical: 20, alignItems: "center" },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
  elasticDelete: {
    position: "absolute",
    right: 15,
    top: "50%",
    backgroundColor: "#FF3B30",
    width: 25,
    height: 25,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
    elevation: 6,
  },
  // ✅ Premium Offline/Empty State Styles
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    marginTop: 10,
  },
  errorIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
    // Slight shadow for depth
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30", // Premium red for error
    borderWidth: 2,
    borderColor: theme.colors.surface,
    zIndex: 1,
  },
  errorText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    letterSpacing: -0.3, // Tighter spacing for modern look
  },
  errorSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: "400",
  },
});

export default LocationInputTab;
