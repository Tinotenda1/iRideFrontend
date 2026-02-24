// app/passenger/components/TripLocationCard.tsx
import { Navigation } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../constants/theme";
import { createStyles } from "../../../utils/styles";
import { useRideBooking } from "../../context/RideBookingContext";

interface TripLocationCardProps {
  onPress?: () => void;
  topPosition: number; // ✅ Added prop to determine position from parent
}

const TripLocationCard: React.FC<TripLocationCardProps> = ({
  onPress,
  topPosition,
}) => {
  const { rideData, currentRide } = useRideBooking();
  const RIDE_DELAY = Number(
    process.env.ride_Tab_And_Trip_Location_Card_Delay || 600,
  );

  const isBookingActive = rideData.status === "idle";
  const translateY = useRef(new Animated.Value(-300)).current; // Start hidden

  useEffect(() => {
    const hasDestination = !!rideData.destination;
    const delayTime = hasDestination ? RIDE_DELAY : 0;

    Animated.spring(translateY, {
      toValue: topPosition, // ✅ Now controlled by parent
      useNativeDriver: true,
      tension: 60,
      friction: 10,
      delay: delayTime,
    }).start();
  }, [topPosition, rideData.destination, RIDE_DELAY]);

  return (
    <Animated.View
      pointerEvents={isBookingActive ? "auto" : "none"}
      style={[
        styles.animatedWrapper,
        {
          transform: [{ translateY }],
          opacity: isBookingActive ? 1 : 0.9,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        disabled={!isBookingActive}
        style={styles.cardContent}
      >
        <View style={styles.lineDecorator}>
          <View style={[styles.dotPickup]} />
          <View style={styles.line} />
          <View style={[styles.squareDestination]} />
        </View>

        <View style={styles.locationsWrapper}>
          <View style={styles.locationRow}>
            <Text
              style={[
                styles.locationText,
                !isBookingActive && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {currentRide?.pickup?.address || rideData.pickupLocation?.name}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.locationRow}>
            <Text
              style={[
                styles.locationText,
                styles.destinationText,
                !isBookingActive && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {currentRide?.destination?.name || rideData.destination?.name}
            </Text>
          </View>
        </View>

        {isBookingActive && (
          <View style={styles.sideAction}>
            <Navigation size={18} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ... keep existing styles ...
const styles = createStyles({
  animatedWrapper: {
    position: "absolute",
    top: 0,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cardContent: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: "center",
    minHeight: 80,
  },
  lineDecorator: {
    alignItems: "center",
    width: 20,
    height: 40,
    marginRight: theme.spacing.sm,
  },
  dotPickup: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  squareDestination: { width: 6, height: 6, backgroundColor: "#d34444ff" },
  locationsWrapper: { flex: 1, justifyContent: "center" },
  locationRow: { height: 22, justifyContent: "center" },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  destinationText: { color: theme.colors.text, fontWeight: "700" },
  disabledText: { color: "#506055ff", fontWeight: "500" },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.3,
    marginVertical: 4,
  },
  sideAction: {
    paddingLeft: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TripLocationCard;
