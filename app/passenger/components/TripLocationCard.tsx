// app/passenger/components/TripLocationCard.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { Navigation } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../../constants/theme";
import { createStyles } from "../../../utils/styles";
import { useRideBooking } from "../../context/RideBookingContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  // Start hidden off-screen based on device height
  const translateY = useRef(new Animated.Value(-SCREEN_HEIGHT * 0.4)).current;

  useEffect(() => {
    const hasDestination = !!rideData.destination;
    const delayTime = hasDestination ? RIDE_DELAY : 0;

    Animated.spring(translateY, {
      toValue: topPosition,
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
          opacity: 1,
        },
      ]}
    >
      <TouchableOpacity
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
              {currentRide?.pickup?.name || rideData.pickupLocation?.name}
            </Text>
          </View>
          <View style={styles.divider} />
          <Text
            style={[
              styles.locationText,
              styles.destinationText,
              !isBookingActive && styles.disabledText,
            ]}
            numberOfLines={1}
          >
            {currentRide?.destination?.name ||
              currentRide?.destination?.address ||
              rideData.destination?.address ||
              rideData.destination?.name ||
              "Select destination"}
          </Text>
        </View>

        {isBookingActive && (
          <View style={styles.sideAction}>
            <Navigation size={ms(18)} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = createStyles({
  animatedWrapper: {
    position: "absolute",
    top: 0,
    left: s(theme.spacing.md),
    right: s(theme.spacing.md),
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: ms(10),
    elevation: 8,
  },
  cardContent: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: ms(16),
    padding: s(theme.spacing.md),
    alignItems: "center",
    minHeight: vs(80),
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  lineDecorator: {
    alignItems: "center",
    width: s(20),
    height: vs(40),
    marginRight: s(theme.spacing.sm),
  },
  dotPickup: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: theme.colors.primary,
  },
  line: {
    flex: 1,
    width: s(1),
    backgroundColor: theme.colors.border,
    marginVertical: vs(2),
  },
  squareDestination: {
    width: ms(6),
    height: ms(6),
    backgroundColor: theme.colors.red,
  },
  locationsWrapper: { flex: 1, justifyContent: "center" },
  locationRow: { height: vs(22), justifyContent: "center" },
  locationText: {
    fontSize: ms(14),
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  destinationText: { color: theme.colors.text, fontWeight: "700" },
  disabledText: { color: "#506055ff", fontWeight: "500" },
  divider: {
    height: vs(1),
    backgroundColor: theme.colors.background,
    opacity: 0.3,
    marginVertical: vs(4),
  },
  sideAction: {
    paddingLeft: s(theme.spacing.sm),
    marginLeft: s(theme.spacing.sm),
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TripLocationCard;
