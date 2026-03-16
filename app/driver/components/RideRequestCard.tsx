// app/driver/components/RideRequestCard.tsx
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IRAvatar } from "../../../components/IRAvatar";
import {
  onRemoveRideRequest,
  onRideCancelled,
} from "../socketConnectionUtility/driverSocketService";

const RESPONDED_RIDE_CARD_AUTO_REMOVE_DELAY = 60000; // 35 seconds - can be configured via .env and app.config.js

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDE_DURATION = 400;

interface Props {
  rideId: string;
  rideData: any;
  expiresAt: number;
  submittedOffer?: number;
  onExpire?: (rideId: string) => void;
  onSelect?: (
    rideId: string,
    rideData: any,
    priorityDurationMs: number,
    remainingPriorityMs: number,
  ) => void;
  rideTrayRef?: React.RefObject<any>;
}

export default function RideRequestCard({
  rideId,
  rideData,
  expiresAt,
  submittedOffer,
  onExpire,
  onSelect,
  rideTrayRef,
}: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressValue = useRef(1);
  const animationStartedRef = useRef(false);

  const isSubmitted = submittedOffer !== undefined;
  const isPriority = rideData.broadcastType === "priority";

  const priorityDurationMs = isPriority
    ? Number(rideData.priorityDurationMs) || 0
    : 0;

  // Badge configuration based on offerType with distinct colors
  const getOfferBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case "good":
        return {
          label: "GOOD",
          color: theme.colors.primary,
          bg: theme.colors.background,
        };
      case "fair":
        return {
          label: "FAIR",
          color: theme.colors.secondary,
          bg: theme.colors.background,
        };
      case "poor":
        return {
          label: "POOR",
          color: theme.colors.red,
          bg: theme.colors.background,
        };
      default:
        return null;
    }
  };

  const vehicleTypeLabels: Record<string, string> = {
    "4seater": "4 SEATER",
    "7seater": "7 SEATER",
    pickup2seater: "2 SEATER PICKUP",
    pickup4seater: "4 SEATER PICKUP",
  };

  const badge = getOfferBadge(rideData.offerType);

  useEffect(() => {
    if (!isSubmitted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isSubmitted]);

  const slideOut = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SCREEN_WIDTH,
          duration: SLIDE_DURATION,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => cb?.());
    },
    [slideAnim, opacityAnim],
  );

  const handleSelectCard = () => {
    const remainingMs = isPriority
      ? Math.round(progressValue.current * priorityDurationMs)
      : 0;

    onSelect?.(rideId, rideData, priorityDurationMs, remainingMs);
  };

  // Auto-expire after if responded to
  useEffect(() => {
    if (!isSubmitted) return;

    const timer = setTimeout(() => {
      slideOut(() => {
        // ✅ Close tray directly
        rideTrayRef?.current?.close();

        // Optional: keep old logic
        onExpire?.(rideId);
      });
    }, RESPONDED_RIDE_CARD_AUTO_REMOVE_DELAY); // seconds

    return () => clearTimeout(timer);
  }, [isSubmitted, slideOut, onExpire, rideId]);

  // Socket Listeners to remove expired/declined rides
  useEffect(() => {
    const unsubscribe = onRemoveRideRequest((rideId) => {
      slideOut(() => {
        // ✅ Close tray directly
        rideTrayRef?.current?.close();

        // Optional: keep old logic
        onExpire?.(rideId);
      });
    });
    return () => unsubscribe();
  }, []);

  // Socket Listeners to remove expired/declined rides
  useEffect(() => {
    const unsubscribe = onRideCancelled((rideId) => {
      slideOut(() => {
        // ✅ Close tray directly
        rideTrayRef?.current?.close();

        // Optional: keep old logic
        onExpire?.(rideId);
      });
    });
    return () => unsubscribe();
  }, []);

  // Animation and timer management
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressValue.current = value;
    });

    if (isSubmitted) {
      progressAnim.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
      return () => progressAnim.removeListener(listenerId);
    }

    const remainingMs = expiresAt - Date.now();

    const activeTimerMs = isPriority
      ? Math.max(0, Math.min(priorityDurationMs, remainingMs))
      : 0;

    if (remainingMs <= 0) {
      slideOut(() => onExpire?.(rideId));
      return () => progressAnim.removeListener(listenerId);
    }

    if (!animationStartedRef.current) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
      animationStartedRef.current = true;
    }

    if (isPriority) {
      progressAnim.setValue(1); // reset to full

      Animated.timing(progressAnim, {
        toValue: 0,
        duration: activeTimerMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }

    if (isPriority) {
      timerRef.current = setTimeout(() => {
        progressAnim.setValue(0);
      }, activeTimerMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.removeListener(listenerId);
    };
  }, [
    expiresAt,
    isSubmitted,
    onExpire,
    rideId,
    slideAnim,
    slideOut,
    progressAnim,
    opacityAnim,
    scaleAnim,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const pricePulse = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const renderStars = (rating: number) => {
    return [1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= Math.round(rating) ? "star" : "star-outline"}
        size={7}
        color={
          isSubmitted
            ? "#cbd5e1"
            : i <= Math.round(rating)
              ? "#FFC107"
              : "#cbd5e1"
        }
      />
    ));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        isSubmitted ? styles.submittedCard : styles.freshCard,
        {
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.cardTitleHeader}>
        <Text
          style={[styles.cardTitleText, isSubmitted && styles.submittedText]}
        >
          {isSubmitted ? "Accepted Ride Request" : "New Request"} -{" "}
          {vehicleTypeLabels[rideData.vehicleType] || "Ride"}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSelectCard}
        style={styles.content}
      >
        {/* LEFT COLUMN: Avatar, Name, Rating */}
        <View style={[styles.leftCol, isSubmitted && styles.desaturated]}>
          <IRAvatar
            source={
              rideData.passengerPic ? { uri: rideData.passengerPic } : undefined
            }
            name={rideData.passengerName}
            size="md"
          />
          <Text
            style={[
              styles.nameUnderAvatar,
              isSubmitted && styles.submittedText,
            ]}
            numberOfLines={2}
          >
            {rideData.passengerName || "Passenger"}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(parseFloat(rideData.passengerRating || "5"))}
            <Text
              style={[
                styles.ratingValueText,
                isSubmitted && styles.submittedText,
              ]}
            >
              ({parseFloat(rideData.passengerRating || "5").toFixed(2)})
            </Text>
          </View>
          <Text
            style={[styles.tripCountText, isSubmitted && styles.submittedText]}
          >
            {rideData.passengerTrips || "0"} trips
          </Text>
        </View>

        {/* RIGHT COLUMN */}
        <View style={styles.rightCol}>
          {/* TOP ROW: Distance/ETA left, Badge/Price/Payment right */}
          <View style={styles.headerRow}>
            <View style={styles.topLeftInfo}>
              <Text
                style={[
                  styles.distanceText,
                  isSubmitted && styles.submittedText,
                ]}
              >
                {(rideData.distanceToPickup / 1000)?.toFixed(1)} km away
              </Text>
              <Text
                style={[styles.etaText, isSubmitted && styles.submittedText]}
              >
                ({Math.ceil(rideData.etaToPickup / 60)} min)
              </Text>
            </View>

            <View style={styles.priceContainer}>
              {badge && !isSubmitted && (
                <View
                  style={[
                    styles.offerBadge,
                    { backgroundColor: badge.bg, borderColor: badge.color },
                  ]}
                >
                  <Text style={[styles.offerBadgeText, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
              )}
              <Animated.View
                style={[
                  styles.priceRow,
                  !isSubmitted && { transform: [{ scale: pricePulse }] },
                ]}
              >
                <Text
                  style={[
                    styles.priceText,
                    isSubmitted && styles.submittedPrice,
                  ]}
                >
                  $
                  {(isSubmitted ? submittedOffer : rideData.offer)?.toFixed(
                    2,
                  ) ?? "--"}
                </Text>
              </Animated.View>
              <Text
                style={[
                  styles.paymentLabel,
                  isSubmitted && styles.submittedText,
                ]}
              >
                {rideData.paymentMethod === "ecocash" ? "ECO" : "CASH"}
              </Text>
            </View>
          </View>

          {/* ADDRESS SECTION */}
          <View style={styles.addressSection}>
            <View style={styles.addressLine}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isSubmitted
                      ? "#cbd5e1"
                      : theme.colors.primary,
                  },
                ]}
              />
              <Text
                style={[
                  styles.addressText,
                  isSubmitted && styles.submittedText,
                ]}
                numberOfLines={1}
              >
                {rideData.pickup?.address || "Pickup"}
              </Text>
            </View>
            <View style={styles.addressLine}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isSubmitted ? "#cbd5e1" : theme.colors.red,
                  },
                ]}
              />
              <Text
                style={[
                  styles.addressText,
                  isSubmitted && styles.submittedText,
                ]}
                numberOfLines={1}
              >
                {rideData.destination?.address || "Destination"}
              </Text>
            </View>
          </View>

          {/* TRIP DISTANCE: Below Addresses */}
          <Text
            style={[
              styles.tripDistanceMeta,
              isSubmitted && styles.submittedText,
            ]}
          >
            Trip distance: {(rideData.route?.distance || 0)?.toFixed(2)} km
          </Text>

          {/* FOOTER: Additional Info */}
          {(rideData.additionalInfo || isSubmitted) && (
            <View style={styles.footerRow}>
              <View style={{ flex: 1 }}>
                {rideData.additionalInfo && (
                  <Text
                    style={[
                      styles.infoPreview,
                      isSubmitted && styles.submittedText,
                    ]}
                    numberOfLines={1}
                  >
                    {`"${rideData.additionalInfo}"`}
                  </Text>
                )}
              </View>
              {isSubmitted && (
                <View style={styles.statusBadgeProcessing}>
                  <Text style={styles.waitingText}>PENDING</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {!isSubmitted && isPriority && (
        <View style={styles.progressBar}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  freshCard: {
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  submittedCard: {
    backgroundColor: "#fcfdfe",
    elevation: 0,
    borderWidth: 1,
    borderColor: theme.colors.background,
  },
  desaturated: { opacity: 0.5 },
  submittedText: { color: "#94a3b8" },
  submittedPrice: { color: "#94a3b8" },
  card: { borderRadius: 12, marginBottom: 8, overflow: "hidden" },
  cardTitleHeader: {
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  content: { flexDirection: "row", padding: 10 },

  // Left Column Styles
  leftCol: { alignItems: "center", width: 75 },
  nameUnderAvatar: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginTop: 4,
    width: "100%",
  },
  ratingRow: {
    flexDirection: "row",
    marginTop: 2,
    gap: 1,
    alignItems: "center",
  },
  ratingValueText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#64748b",
    marginLeft: 2,
  },
  tripCountText: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: 1,
  },

  // Right Column Styles
  rightCol: { flex: 1, marginLeft: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  topLeftInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "800",
  },
  etaText: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  priceContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  paymentLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    marginLeft: 2,
  },
  offerBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offerBadgeText: { fontSize: 7, fontWeight: "900" },
  priceRow: { flexDirection: "row", alignItems: "center" },
  priceText: { fontWeight: "900", color: theme.colors.primary, fontSize: 15 },

  addressSection: { gap: 3 },
  addressLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  addressText: { fontSize: 12, color: "#475569", fontWeight: "500", flex: 1 },
  tripDistanceMeta: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    alignItems: "center",
  },
  infoPreview: { fontSize: 10, color: "#94a3b8", fontStyle: "italic" },
  progressBar: { height: 3, backgroundColor: "#f8fafc" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary },
  statusBadgeProcessing: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waitingText: { color: "#0369a1", fontWeight: "800", fontSize: 8 },
});
