// app/passenger/components/DriverOfferCard.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IRAvatar } from "../../../components/IRAvatar";

const SLIDE_DURATION = 300;

interface Props {
  offer: any;
  status: "idle" | "submitting" | "accepted";
  onAccept: (offer: any) => void;
  onDecline: (phone: string) => void;
  onExpire: (phone: string, rideId: string) => void;
}

export const DriverOfferCard: React.FC<Props> = ({
  offer,
  status,
  onAccept,
  onDecline,
  onExpire,
}) => {
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationStartedRef = useRef(false);

  const isProcessing = status === "submitting";
  const isAccepted = status === "accepted";
  const isLocked = isProcessing || isAccepted;

  // Logic for "Your Fare" badge
  const isYourFare = offer.type === "accept";

  const slideOut = useCallback(
    (cb?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: -500,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => cb?.());
    },
    [slideAnim],
  );

  useEffect(() => {
    // Stop timers if we are submitting or have accepted
    if (isLocked) {
      progressAnim.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const remainingMs = offer.expiresAt - Date.now();
    if (remainingMs <= 0) {
      slideOut(() => onExpire(offer.driver.phone, offer.rideId));
      return;
    }

    // Slide In Animation
    if (!animationStartedRef.current) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      animationStartedRef.current = true;
    }

    // Progress bar fallback animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      slideOut(() => onExpire(offer.driver.phone, offer.rideId));
    }, remainingMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [offer.expiresAt, isLocked, slideOut, onExpire, offer.driver.phone]);

  // High-precision sync
  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
      const remainingMs = offer.expiresAt - Date.now();
      const totalDuration = offer.expiresIn || 30000;
      const progress = Math.max(0, Math.min(1, remainingMs / totalDuration));
      progressAnim.setValue(progress);
    }, 16); // ~60fps sync
    return () => clearInterval(interval);
  }, [offer.expiresAt, isLocked, offer.expiresIn]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Animated.View
      style={[styles.card, { transform: [{ translateX: slideAnim }] }]}
    >
      <View style={[styles.content, isLocked && styles.lockedContent]}>
        {/* LEFT COLUMN: Avatar, Rating, Ride Count */}
        <View style={styles.leftCol}>
          <IRAvatar
            source={{ uri: offer.driver.profilePic }}
            name={offer.driver.name}
            size="md"
          />
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFC107" />
            <Text style={styles.ratingText}>{offer.driver.rating}</Text>
          </View>
          <Text style={styles.ridesText}>
            {offer.driver.totalTrips || 0} rides
          </Text>
        </View>

        {/* RIGHT COLUMN: Details & Actions */}
        <View style={styles.rightCol}>
          <View style={styles.headerRow}>
            <Text style={styles.driverName}>{offer.driver.name}</Text>

            <View style={styles.priceContainer}>
              {isYourFare && (
                <View style={styles.yourFareBadge}>
                  <Text style={styles.yourFareText}>Your fare</Text>
                </View>
              )}
              <Text style={styles.priceText}>
                $
                {typeof offer.offer === "number"
                  ? offer.offer.toFixed(2)
                  : offer.offer}
              </Text>
            </View>
          </View>

          {/* Vehicle Info Row */}
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleText}>
              {offer.driver.vehicle.color} {offer.driver.vehicle.model}
            </Text>
            <View style={styles.dotSeparator} />
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>
                {offer.driver.vehicle.licensePlate}
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.etaContainer}>
              <Text style={styles.etaText}>
                <Ionicons name="time-outline" size={14} />
              </Text>
              <Text style={styles.distanceText}>
                {offer.duration ? ` ${offer.duration} min` : ""}
                {offer.distance ? ` (${offer.distance} km)` : ""}
              </Text>
            </View>

            {isAccepted ? (
              <View style={styles.statusBadgeAccepted}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.acceptedText}>MATCHED!</Text>
              </View>
            ) : isProcessing ? (
              <View style={styles.statusBadgeProcessing}>
                <Text style={styles.waitingText}>PROCESSING...</Text>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => slideOut(() => onDecline(offer.driver.phone))}
                >
                  <Text style={styles.declineBtn}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => onAccept(offer)}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {!isLocked && (
        <View style={styles.progressBar}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  lockedContent: { opacity: 0.7 },
  content: { flexDirection: "row", padding: 12 },

  // Left Column
  leftCol: { alignItems: "center", width: 60 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  etaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  ratingText: { fontSize: 10, fontWeight: "bold", marginLeft: 2 },
  ridesText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 3,
    fontWeight: "500",
  }, // Added style for rides

  // Right Column
  rightCol: { flex: 1, marginLeft: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  }, // Changed to flex-start for badge alignment
  driverName: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1e293b",
    marginTop: 2,
  },

  // Price & Badges
  priceContainer: { alignItems: "flex-end" },
  priceText: { fontWeight: "800", color: "#10B981", fontSize: 18 },
  yourFareBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  yourFareText: {
    fontSize: 9,
    color: "#166534",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // Vehicle Details
  vehicleRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  vehicleText: { color: "#64748b", fontSize: 13, fontWeight: "500" },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 6,
  },
  plateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  plateText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Footer & Actions
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
  },
  etaText: { color: "#64748b", fontSize: 13, fontWeight: "500" },
  actionButtons: { flexDirection: "row", gap: 16, alignItems: "center" },
  acceptBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  declineBtn: { color: "#EF4444", fontWeight: "600" },
  progressBar: { height: 3, backgroundColor: "#f1f5f9" },
  progressFill: { height: "100%", backgroundColor: "#10B981" },
  statusBadgeProcessing: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  waitingText: { color: "#0284c7", fontWeight: "800", fontSize: 11 },
  statusBadgeAccepted: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptedText: { color: "#fff", fontWeight: "800", fontSize: 11 },
});
