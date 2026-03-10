// app/passenger/components/tabs/LocationInputTab.tsx

import * as Location from "expo-location";
import { Clock, Navigation, Search, Trash2 } from "lucide-react-native";
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
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ActivityIndicator } from "react-native"; // Add this to your imports
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";
import { Place } from "../map/LocationSearch";

/* =====================================================
    Elastic Swipe Item
===================================================== */

interface SwipeItemProps {
  item: Place;
  index: number;
  isLast: boolean;
  armedRowId: string | null;
  setArmedRowId: (id: string | null) => void;
  onPress: () => void;
  onDelete: () => void;
}

const SwipeableDestinationItem: React.FC<SwipeItemProps> = ({
  item,
  index,
  isLast,
  armedRowId,
  setArmedRowId,
  onPress,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const translateX = useSharedValue(0);

  // FIX: Keep the UI in the "armed" state even if the parent state is cleared,
  // as long as we are currently deleting.
  const isArmed = armedRowId === item.id || isDeleting;

  const fastSnapConfig = {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (isDeleting) return; // Disable swipe while deleting
      if (event.translationX < 0) {
        translateX.value = event.translationX * 0.35;
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      if (event.translationX < -60) {
        runOnJS(setArmedRowId)(item.id || null);
      }
      translateX.value = withSpring(0, fastSnapConfig);
    })
    .onFinalize(() => {
      if (translateX.value !== 0) {
        translateX.value = withSpring(0, fastSnapConfig);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={rowStyle}>
        <TouchableOpacity
          style={[styles.suggestionItem, isLast && styles.noBorder]}
          activeOpacity={0.85}
          onPress={() => {
            if (!isArmed && !isDeleting) onPress();
          }}
        >
          <View style={styles.iconCircle}>
            <Clock size={18} color={theme.colors.textSecondary} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.placeName}>{item.name}</Text>
            <Text style={styles.placeAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          {isArmed ? (
            <View style={{ width: 30, alignItems: "center" }}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    // Changed to async
                    setIsDeleting(true);
                    try {
                      // Logic: call onDelete and wait for it
                      await onDelete();
                    } catch (error) {
                      // If parent throws, stop loading
                      setIsDeleting(false);
                    } finally {
                      // Only disarm if successful or specifically needed
                      setArmedRowId(null);
                    }
                  }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <Trash2 size={18} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Navigation size={16} color={theme.colors.border} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
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
  const { rideData, updateRideData, loading, hideRecentDestination } =
    useRideBooking();

  const [armedRowId, setArmedRowId] = React.useState<string | null>(null);

  // Back handler to disarm when hardware back is pressed
  useEffect(() => {
    const backAction = () => {
      if (armedRowId) {
        setArmedRowId(null);
        return true; // prevent default back behavior
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => subscription.remove();
  }, [armedRowId]);

  // Auto-set Pickup to Current Location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      const reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverse[0]
        ? `${reverse[0].name || ""} ${reverse[0].street || ""}`.trim()
        : "Current Location";

      const currentPlace: Place = {
        id: "current",
        name: address || "Current Location",
        address: address || "Current Location",
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      updateRideData({ pickupLocation: currentPlace });
    })();
  }, []);

  // Log prices whenever they are updated (optional)
  useEffect(() => {
    if (
      rideData.vehiclePrices &&
      Object.keys(rideData.vehiclePrices).length > 0
    ) {
      console.log("[RideTab] Received updated prices:", rideData.vehiclePrices);
    }
  }, [rideData.vehiclePrices]);

  // Inside LocationInputTab.tsx

  const handleSelect = (
    field: "pickup" | "destination",
    place: Place | null,
  ) => {
    if (field === "destination" && place) {
      // VALIDATION: Check if pickup exists
      if (!rideData.pickupLocation) {
        Alert.alert(
          "Pickup Missing",
          "We need to know where to pick you up first!",
          [{ text: "OK" }],
        );
        return; // Stop the flow
      }

      updateRideData({
        [field]: place,
        status: "booking", // trigger status change
      });
      onSuggestionSelect?.(place);
    } else {
      updateRideData({
        [field]: place,
      });
    }
    console.log(`[RideTab] ${field} set to:`, place);
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
          {recentDestinations.length > 0 && (
            <Text style={styles.sectionTitle}>Recent Destinations</Text>
          )}

          {loading && recentDestinations.length === 0 ? (
            <View style={styles.loaderContainer} />
          ) : recentDestinations.length > 0 ? (
            // Removed the extra { } here. Just go straight to the map.
            recentDestinations.map((item: Place, index: number) => {
              const stableKey =
                item.id || `${item.latitude}-${item.longitude}-${index}`;

              return (
                <SwipeableDestinationItem
                  key={stableKey}
                  item={item}
                  index={index}
                  isLast={index === recentDestinations.length - 1}
                  armedRowId={armedRowId}
                  setArmedRowId={setArmedRowId}
                  onPress={() => handleSelect("destination", item)}
                  onDelete={async () => {
                    // Changed to async
                    if (item.id) {
                      try {
                        await hideRecentDestination(item.id);
                      } catch (err) {
                        // Trigger the Alert on failure
                        Alert.alert(
                          "Deletion Failed",
                          "We couldn't remove this destination. Please check your network connection and try again.",
                          [{ text: "OK" }],
                        );
                        throw err; // Re-throw so the item can reset its 'isDeleting' state
                      }
                    }
                  }}
                />
              );
            })
          ) : (
            /* Premium offline / empty state */
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
  // Premium offline/empty state styles
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
    backgroundColor: "#FF3B30",
    borderWidth: 2,
    borderColor: theme.colors.surface,
    zIndex: 1,
  },
  errorText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: "400",
  },
});

export default LocationInputTab;
