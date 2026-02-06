// app/passenger/components/tabs/LocationInputTab.tsx

import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Clock, Navigation, Search, Star, Trash2 } from "lucide-react-native";

import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";
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

  /* -------------------------------
     Reset
  -------------------------------- */
  const reset = () => {
    isArmed.value = false;

    translateX.value = withTiming(0, {
      duration: 180,
    });
  };

  /* -------------------------------
     Android Back Button
  -------------------------------- */
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

  /* -------------------------------
     Gesture
  -------------------------------- */
  const onGestureEvent = (e: any) => {
    const x = e.nativeEvent.translationX;

    if (x < 0) {
      // Elastic resistance
      translateX.value = x * ELASTIC_FACTOR;
    }
  };

  const onEnd = () => {
    if (translateX.value < SWIPE_TRIGGER * ELASTIC_FACTOR) {
      isArmed.value = true;
    }

    // Smooth snap back (no bounce)
    translateX.value = withTiming(0, {
      duration: 180,
    });
  };

  /* -------------------------------
     Animations
  -------------------------------- */
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: isArmed.value ? 1 : 0,
    transform: [
      {
        scale: withTiming(isArmed.value ? 1 : 0.8, {
          duration: 150,
        }),
      },
    ],
  }));

  /* -------------------------------
     UI
  -------------------------------- */
  return (
    <View style={{ position: "relative" }}>
      {/* Delete Icon */}
      <Animated.View style={[styles.elasticDelete, deleteStyle]}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Remove Destination", item.name, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: reset,
              },
              {
                text: "Delete",
                style: "destructive",
                onPress: onDelete,
              },
            ]);
          }}
        >
          <Trash2 size={16} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Row */}
      <PanGestureHandler onGestureEvent={onGestureEvent} onEnded={onEnd}>
        <Animated.View style={rowStyle}>
          <TouchableOpacity
            style={[styles.suggestionItem, isLast && styles.noBorder]}
            activeOpacity={0.85}
            onPress={() => {
              if (!isArmed.value) {
                onPress();
              }
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
  const { rideData, updateRideData, loading, hideRecentDestination } =
    useRideBooking();

  useEffect(() => {
    updateRideData({ destination: null });
  }, []);

  const handleSelect = (
    field: "pickup" | "destination",
    place: Place | null,
  ) => {
    updateRideData({ [field]: place });

    if (field === "destination" && place) {
      onSuggestionSelect?.(place);
    }
  };

  const recentDestinations = rideData.recentDestinations || [];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.lineDecorator}>
            <View style={styles.dotPickup} />
            <View style={styles.line} />
            <View style={styles.squareDestination} />
          </View>

          <View style={styles.fieldsWrapper}>
            {/* Pickup */}
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

            {/* Destination */}
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

        {/* Suggestions */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.suggestionsContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Recent Destinations</Text>

          {loading && recentDestinations.length === 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
            </View>
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
            <Text style={styles.emptyText}>No recent destinations yet</Text>
          )}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

/* =====================================================
   Styles
===================================================== */

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },

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

  squareDestination: {
    width: 8,
    height: 8,
    backgroundColor: "#d34444ff",
  },

  fieldsWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
  },

  inputContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },

  inputSeparator: {
    height: 1,
    backgroundColor: theme.colors.border + "50",
  },

  searchIcon: {
    marginLeft: theme.spacing.xs,
  },

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

  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },

  placeAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  loaderContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },

  /* Elastic Delete */
  elasticDelete: {
    position: "absolute",
    right: 15,
    top: "50%",
    //transform: [{ translateY: -22 }],
    backgroundColor: "#FF3B30",
    width: 25,
    height: 25,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
    elevation: 6,
  },
});

export default LocationInputTab;
