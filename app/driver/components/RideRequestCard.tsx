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
    currentProgress: number,
    remainingMs: number,
    rideData: any,
  ) => void;
}

export default function RideRequestCard({
  rideId,
  rideData,
  expiresAt,
  submittedOffer,
  onExpire,
  onSelect,
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

  // Badge configuration based on offerType with distinct colors
  const getOfferBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case "good":
        return { label: "GOOD", color: "#059669", bg: "#d1fae5" };
      case "fair":
        return { label: "FAIR", color: "#2563eb", bg: "#dbeafe" };
      case "poor":
        return { label: "POOR", color: "#dc2626", bg: "#fee2e2" };
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

  const handleSelect = () => {
    onSelect?.(
      rideId,
      progressValue.current,
      Math.max(0, expiresAt - Date.now()),
      rideData,
    );
    console.log("RideRequestCard selected:", rideData);
  };

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

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      slideOut(() => onExpire?.(rideId));
    }, remainingMs);

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
      {/* CARD TITLE HEADER */}
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
        onPress={handleSelect}
        disabled={false}
        style={styles.content}
      >
        {/* LEFT COLUMN */}
        <View style={[styles.leftCol, isSubmitted && styles.desaturated]}>
          <IRAvatar
            source={
              rideData.passengerPic ? { uri: rideData.passengerPic } : undefined
            }
            name={rideData.passengerName}
            size="md"
          />
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
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.passengerName,
                isSubmitted && styles.submittedText,
              ]}
              numberOfLines={1}
            >
              {rideData.passengerName || "Passenger"}
            </Text>

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
            </View>
          </View>

          {/* META INFO */}
          <View style={styles.metaInfoRow}>
            <Text
              style={[styles.metaLabel, isSubmitted && styles.submittedText]}
            >
              {rideData.paymentMethod === "ecocash" ? "Eco" : "Cash"}
            </Text>
            <View style={styles.dotSeparator} />
            <Text
              style={[styles.distanceText, isSubmitted && styles.submittedText]}
            >
              {parseFloat(rideData.pickupDistanceKm || "0").toFixed(1)}km away
            </Text>
            <View style={styles.dotSeparator} />
            <Text
              style={[styles.metaLabel, isSubmitted && styles.submittedText]}
            >
              {parseFloat(rideData.rideDistanceKm || "0").toFixed(2)}km
            </Text>
          </View>

          {/* ADDRESS SECTION */}
          <View style={styles.addressSection}>
            <View style={styles.addressLine}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isSubmitted ? "#cbd5e1" : "#10B981" },
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
                  { backgroundColor: isSubmitted ? "#cbd5e1" : "#ef4444" },
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

          {/* FOOTER */}
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

      {!isSubmitted && (
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
    borderColor: "#f1f5f9",
  },
  submittedCard: {
    backgroundColor: "#fcfdfe",
    elevation: 0,
    borderWidth: 1,
    borderColor: "#f1f5f9",
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
    fontSize: 14,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  content: { flexDirection: "row", padding: 10 },
  leftCol: { alignItems: "center", width: 68 },
  ratingRow: {
    flexDirection: "row",
    marginTop: 4,
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
    marginTop: 2,
  },

  rightCol: { flex: 1, marginLeft: 10 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passengerName: { fontWeight: "700", fontSize: 14, color: "#1e293b", flex: 1 },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  offerBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offerBadgeText: {
    fontSize: 8,
    fontWeight: "900",
  },
  priceRow: { flexDirection: "row", alignItems: "center" },
  priceText: { fontWeight: "800", color: "#10B981", fontSize: 16 },

  metaInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 4,
  },
  metaLabel: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  distanceText: { fontSize: 10, color: "#10B981", fontWeight: "800" },
  dotSeparator: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 6,
  },
  addressSection: { gap: 2 },
  addressLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  addressText: { fontSize: 12, color: "#475569", fontWeight: "500", flex: 1 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    alignItems: "center",
  },
  infoPreview: { fontSize: 10, color: "#94a3b8", fontStyle: "italic" },
  progressBar: { height: 3, backgroundColor: "#f8fafc" },
  progressFill: { height: "100%", backgroundColor: "#10B981" },
  statusBadgeProcessing: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waitingText: { color: "#0369a1", fontWeight: "800", fontSize: 8 },
});
