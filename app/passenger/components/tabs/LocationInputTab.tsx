import { Clock, Navigation, Search, Trash2 } from "lucide-react-native";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

import * as Location from "expo-location";
import { theme } from "../../../../constants/theme";
import { ms, s, vs } from "../../../../utils/responsive";
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

  const isArmed = armedRowId === item.id || isDeleting;

  const fastSnapConfig = {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (isDeleting) return;
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
                    setIsDeleting(true);
                    try {
                      await onDelete();
                    } catch (error) {
                      setIsDeleting(false);
                    } finally {
                      setArmedRowId(null);
                    }
                  }}
                >
                  <Trash2 size={18} color="#FF3B30" />
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
  onContentHeight?: (h: number) => void;
}

const LocationInputTab: React.FC<LocationInputTabProps> = ({
  onFocus,
  onSuggestionSelect,
  // onContentHeight removed from usage to use fallback height only
}) => {
  const { rideData, updateRideData, loading, hideRecentDestination } =
    useRideBooking();
  const [armedRowId, setArmedRowId] = React.useState<string | null>(null);

  useEffect(() => {
    const backAction = () => {
      if (armedRowId) {
        setArmedRowId(null);
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => subscription.remove();
  }, [armedRowId]);

  useEffect(() => {
    const setPickupToCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const location = await Location.getCurrentPositionAsync({});

        const reverseGeocodeWithTimeout = async (coords: {
          latitude: number;
          longitude: number;
        }) => {
          return Promise.race([
            Location.reverseGeocodeAsync(coords),
            new Promise<Location.LocationGeocodedAddress[]>((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 5000),
            ),
          ]);
        };

        let address = "Current Location";
        try {
          const reverse = await reverseGeocodeWithTimeout({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          if (reverse[0]) {
            address =
              `${reverse[0].name || ""} ${reverse[0].street || ""}`.trim() ||
              "Current Location";
          }
        } catch (err) {
          console.warn("Reverse geocode failed", err);
        }

        const currentPlace: Place = {
          id: "current",
          name: address,
          address: address,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        updateRideData({ pickupLocation: currentPlace });
      } catch (err) {
        console.error("Pickup set failed", err);
      }
    };
    setPickupToCurrentLocation();
  }, [updateRideData]);

  const handleSelect = (
    field: "pickup" | "destination",
    place: Place | null,
  ) => {
    if (field === "destination" && place) {
      if (!rideData.pickupLocation) {
        Alert.alert(
          "Pickup Missing",
          "We need to know where to pick you up first!",
        );
        return;
      }
      updateRideData({ [field]: place, status: "booking" });
      onSuggestionSelect?.(place);
    } else {
      updateRideData({ [field]: place });
    }
  };

  const recentDestinations = rideData.recentDestinations || [];

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Removed onLayout to ensure this tab uses the parent's fallback height only */}
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

        <Animated.ScrollView
          style={styles.scrollableSuggestions}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          <View style={styles.suggestionsContainer}>
            {recentDestinations.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Destinations</Text>
            )}

            {loading && recentDestinations.length === 0 ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : recentDestinations.length > 0 ? (
              recentDestinations.map((item: Place, index: number) => (
                <SwipeableDestinationItem
                  key={item.id || index}
                  item={item}
                  index={index}
                  isLast={index === recentDestinations.length - 1}
                  armedRowId={armedRowId}
                  setArmedRowId={setArmedRowId}
                  onPress={() => handleSelect("destination", item)}
                  onDelete={async () => {
                    if (item.id) await hideRecentDestination(item.id);
                  }}
                />
              ))
            ) : !loading ? (
              <View style={styles.driftWelcomeContainer}>
                <Text style={styles.driftTitle}>Ready to drift somewhere?</Text>
                <Text style={styles.driftSubtext}>
                  Your most recent destinations will appear here for a quicker
                  start.
                </Text>
                <View style={styles.instructionBox}>
                  <View style={styles.instructionRow}>
                    <View style={styles.miniIcon}>
                      <Trash2 size={14} color={theme.colors.red} />
                    </View>
                    <Text style={styles.instructionText}>
                      Swipe left and tap the trash icon to remove a destination.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.errorContainer}>
                <View style={styles.errorIconCircle}>
                  <View style={styles.statusDot} />
                  <Navigation
                    size={20}
                    color={theme.colors.textSecondary + "80"}
                  />
                </View>
                <Text style={styles.errorText}>No destinations found</Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = createStyles({
  root: {
    // Container-only styles
  },
  container: {
    backgroundColor: theme.colors.surface,
    paddingBottom: vs(theme.spacing.xl),
  },
  inputSection: {
    flexDirection: "row",
    paddingHorizontal: s(theme.spacing.md),
    paddingTop: vs(theme.spacing.md),
    backgroundColor: theme.colors.surface,
  },
  lineDecorator: {
    alignItems: "center",
    width: s(20),
    marginVertical: vs(15),
    marginRight: s(theme.spacing.sm),
  },
  dotPickup: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: theme.colors.primary,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: vs(4),
  },
  squareDestination: {
    width: ms(8),
    height: ms(8),
    backgroundColor: theme.colors.red,
  },
  fieldsWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: ms(12),
    paddingHorizontal: s(theme.spacing.md),
  },
  inputContainer: {
    height: vs(50),
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    fontSize: ms(15),
    color: theme.colors.text,
  },
  inputSeparator: {
    height: 1,
    backgroundColor: theme.colors.border + "50",
  },
  searchIcon: {
    marginLeft: s(theme.spacing.xs),
  },
  scrollableSuggestions: {
    maxHeight: vs(300),
  },
  suggestionsContainer: {
    marginTop: vs(theme.spacing.lg),
    paddingHorizontal: s(theme.spacing.md),
  },
  sectionTitle: {
    fontSize: ms(11),
    fontWeight: "800",
    color: theme.colors.textSecondary,
    marginBottom: vs(theme.spacing.sm),
    textTransform: "uppercase",
    letterSpacing: s(1.5),
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(theme.spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + "30",
    backgroundColor: theme.colors.surface,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  iconCircle: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(theme.spacing.md),
  },
  textContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: ms(16),
    fontWeight: "600",
    color: theme.colors.text,
  },
  placeAddress: {
    fontSize: ms(13),
    color: theme.colors.textSecondary,
    marginTop: vs(2),
  },
  loaderContainer: {
    paddingVertical: vs(20),
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(40),
  },
  errorIconCircle: {
    width: ms(50),
    height: ms(50),
    borderRadius: ms(25),
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(16),
  },
  statusDot: {
    position: "absolute",
    top: vs(12),
    right: s(12),
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: theme.colors.red,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    zIndex: 1,
  },
  errorText: {
    fontSize: ms(15),
    fontWeight: "600",
    color: theme.colors.text,
  },
  driftWelcomeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(30),
  },
  driftTitle: {
    fontSize: ms(20),
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: vs(8),
    textAlign: "center",
  },
  driftSubtext: {
    fontSize: ms(14),
    lineHeight: vs(20),
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: vs(24),
  },
  instructionBox: {
    backgroundColor: theme.colors.background,
    padding: s(theme.spacing.md),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: theme.colors.border + "40",
    width: "100%",
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
  },
  miniIcon: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(8),
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    flex: 1,
    fontSize: ms(12),
    color: theme.colors.textSecondary,
    fontWeight: "500",
    lineHeight: vs(16),
  },
});

export default LocationInputTab;
