// app/passenger/components/DriverOfferCard.tsx
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import { IRAvatar } from "../../../components/IRAvatar";
import { getApiBaseUrl } from "../../../utils/api"; // Added for server image support
import { createStyles } from "../../../utils/styles";

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
  const slideAnim = useRef(new Animated.Value(s(-400))).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationStartedRef = useRef(false);

  const isProcessing = status === "submitting";
  const isAccepted = status === "accepted";
  const isLocked = isProcessing || isAccepted;

  const isYourFare = offer.type === "accept";

  // ADD THIS LOG HERE
  console.log("DEBUG: DriverOfferCard rendered for:", offer?.driver?.name);
  console.log("DEBUG: profilePic value:", offer?.driver?.profilePic);

  /**
   * ✅ Robust Remote Avatar Resolver
   */
  const getDriverAvatar = (path: string | null | undefined) => {
    if (!path || path === "" || path === "null") return undefined;

    let finalUri = "";

    if (
      path.startsWith("http") ||
      path.startsWith("file://") ||
      path.startsWith("content://")
    ) {
      finalUri = path;
    } else {
      try {
        const baseUrl = getApiBaseUrl().replace(/\/$/, "");
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        finalUri = `${baseUrl}${cleanPath}`;
      } catch (e) {
        finalUri = path;
      }
    }

    // DEBUG: Uncomment this to see the URL in your console
    console.log("Final Driver Avatar URI:", finalUri);

    return { uri: finalUri };
  };

  const slideOut = useCallback(
    (cb?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: s(-500),
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => cb?.());
    },
    [slideAnim],
  );

  useEffect(() => {
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

    if (!animationStartedRef.current) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      animationStartedRef.current = true;
    }

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

  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
      const remainingMs = offer.expiresAt - Date.now();
      const totalDuration = offer.expiresIn || 30000;
      const progress = Math.max(0, Math.min(1, remainingMs / totalDuration));
      progressAnim.setValue(progress);
    }, 16);
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
        <View style={styles.leftCol}>
          <IRAvatar
            source={(() => {
              const res = getDriverAvatar(offer.driver.profilePic);
              console.log("Helper returned:", res);
              return res;
            })()}
            name={offer.driver.name}
            size="md"
          />
          <View style={styles.ratingBadge}>
            {Array.from({ length: 5 }).map((_, i) => {
              const rating = Number(offer.driver.rating) || 0;
              return (
                <Ionicons
                  key={i}
                  name="star"
                  size={ms(8)}
                  color={i < Math.round(rating) ? "#FFC107" : "#E5E7EB"}
                  style={{ marginRight: s(1) }}
                />
              );
            })}
            <Text style={styles.ratingText}>({offer.driver.rating})</Text>
          </View>
          <Text style={styles.ridesText}>
            {offer.driver.totalTrips || 0} rides
          </Text>
        </View>

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
                <Ionicons name="time-outline" size={ms(14)} />
              </Text>
              <Text style={styles.distanceText}>
                {offer.duration ? ` ${offer.duration} min` : ""}
                {offer.distance ? ` (${offer.distance} km)` : ""}
              </Text>
            </View>

            {isAccepted ? (
              <View style={styles.statusBadgeAccepted}>
                <Ionicons name="checkmark-circle" size={ms(16)} color="#fff" />
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

const styles = createStyles({
  card: {
    backgroundColor: "#fff",
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: theme.colors.background,
    marginBottom: vs(10),
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: ms(4),
    shadowOffset: { width: 0, height: 2 },
  },
  lockedContent: { opacity: 0.7 },
  content: { flexDirection: "row", padding: s(12) },
  leftCol: { alignItems: "center", width: s(60) },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: s(6),
    borderRadius: ms(10),
    marginTop: vs(4),
  },
  etaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    color: "#64748b",
    fontSize: ms(13),
    fontWeight: "600",
  },
  ratingText: { fontSize: ms(10), fontWeight: "bold", marginLeft: s(2) },
  ridesText: {
    fontSize: ms(10),
    color: "#94a3b8",
    marginTop: vs(3),
    fontWeight: "500",
  },
  rightCol: { flex: 1, marginLeft: s(12) },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  driverName: {
    fontWeight: "700",
    fontSize: ms(16),
    color: "#1e293b",
    marginTop: vs(2),
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(6),
  },
  priceText: {
    fontWeight: "800",
    color: theme.colors.primary,
    fontSize: ms(18),
  },
  yourFareBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: s(6),
    paddingVertical: vs(2),
    borderRadius: ms(4),
    marginBottom: vs(2),
  },
  yourFareText: {
    fontSize: ms(9),
    color: theme.colors.primary,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  vehicleRow: { flexDirection: "row", alignItems: "center", marginTop: vs(4) },
  vehicleText: { color: "#64748b", fontSize: ms(13), fontWeight: "500" },
  dotSeparator: {
    width: ms(3),
    height: ms(3),
    borderRadius: ms(1.5),
    backgroundColor: "#cbd5e1",
    marginHorizontal: s(6),
  },
  plateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: s(4),
    paddingVertical: vs(1),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  plateText: {
    fontSize: ms(10),
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(10),
    alignItems: "center",
  },
  etaText: { color: "#64748b", fontSize: ms(13), fontWeight: "500" },
  actionButtons: { flexDirection: "row", gap: s(16), alignItems: "center" },
  acceptBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    borderRadius: ms(8),
  },
  acceptBtnText: { color: "#fff", fontWeight: "bold", fontSize: ms(14) },
  declineBtn: { color: "#EF4444", fontWeight: "600", fontSize: ms(14) },
  progressBar: { height: vs(3), backgroundColor: "#f1f5f9" },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary },
  statusBadgeProcessing: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: ms(8),
  },
  waitingText: { color: "#0284c7", fontWeight: "800", fontSize: ms(11) },
  statusBadgeAccepted: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: s(4),
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: ms(8),
  },
  acceptedText: { color: "#fff", fontWeight: "800", fontSize: ms(11) },
});
