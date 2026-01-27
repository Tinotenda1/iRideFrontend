// app/driver/components/trays/RideRequestTray.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { IRButton } from "../../../../components/IRButton";
import { SubmissionState } from "../../index";
import { OfferFareControl } from "../DriverOfferFareControl";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = windowHeight * 0.8;

export interface RideRequestTrayRef {
  open: (
    rideId: string,
    currentProgress: number,
    remainingMs: number,
    existingOffer: number | null,
    status: SubmissionState,
    rideData: any,
  ) => void;
  close: () => void;
}

interface Props {
  driverId: string;
  onOfferSubmitted: (rideId: string, offer: number, baseOffer: number) => void;
  onClose?: () => void;
}

const RideRequestTray = forwardRef<RideRequestTrayRef, Props>(
  ({ driverId, onOfferSubmitted, onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rideId, setRideId] = useState<string | null>(null);
    const [selectedRideData, setSelectedRideData] = useState<any>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0); // Added for text timer

    const [currentOffer, setCurrentOffer] = useState(0);
    const [currentStatus, setCurrentStatus] = useState<SubmissionState>("idle");

    const progressAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null); // Added for text timer

    const baseOffer = selectedRideData?.offer ?? 0;
    const minOffer = selectedRideData?.priceRange?.min ?? baseOffer;
    const maxOffer = selectedRideData?.priceRange?.max ?? baseOffer;

    const clearTimers = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const handleClose = useCallback(() => {
      clearTimers();
      progressAnim.stopAnimation();
      setIsOpen(false);
      setRideId(null);
      setSelectedRideData(null);
      setExpiresAt(null);
      setCurrentStatus("idle");
      onClose?.();
    }, [onClose, progressAnim]);

    useImperativeHandle(
      ref,
      () => ({
        open: (
          rideId,
          currentProgress,
          remainingMs,
          existingOffer,
          status,
          rideData,
        ) => {
          setRideId(rideId);
          setSelectedRideData(rideData);
          setExpiresAt(Date.now() + remainingMs);
          setCurrentStatus(status);
          setCurrentOffer(existingOffer ?? rideData.offer);
          setIsOpen(true);

          if (status === "idle") {
            // 1. Progress Bar Animation
            progressAnim.setValue(currentProgress ?? 1);
            Animated.timing(progressAnim, {
              toValue: 0,
              duration: remainingMs,
              easing: Easing.linear,
              useNativeDriver: false,
            }).start();

            // 2. Numeric Timer Logic
            const initialSeconds = Math.ceil(remainingMs / 1000);
            setSecondsLeft(initialSeconds);

            clearTimers();

            // Expiry timer
            timerRef.current = setTimeout(handleClose, remainingMs);

            // Countdown interval
            intervalRef.current = setInterval(() => {
              setSecondsLeft((prev) => {
                if (prev <= 1) {
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            progressAnim.stopAnimation();
            progressAnim.setValue(0);
            setSecondsLeft(0);
          }
        },
        close: handleClose,
      }),
      [handleClose, progressAnim],
    );

    const submitOffer = () => {
      if (!rideId || !selectedRideData || currentStatus !== "idle") return;
      onOfferSubmitted(rideId, currentOffer, baseOffer);
      setCurrentStatus("submitting");
      clearTimers();
      progressAnim.stopAnimation();
    };

    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleClose();
          return true;
        },
      );
      return () => backHandler.remove();
    }, [isOpen, handleClose]);

    if (!isOpen || !selectedRideData || !expiresAt) return null;

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

    const progressColor = progressAnim.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: ["#EF4444", "#F59E0B", "#00D26A"],
    });

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.container}>
          {/* Top Edge Progress Bar (Only when Idle) */}
          {currentStatus === "idle" && (
            <Animated.View
              style={[
                styles.topProgressBar,
                {
                  width: progressWidth,
                  backgroundColor: progressColor,
                },
              ]}
            />
          )}

          {/* Header Area with Timer Text */}
          <View style={styles.headerArea}>
            {currentStatus === "idle" ? (
              <View style={styles.timerContainer}>
                <Text style={styles.timerDigits}>
                  00:{secondsLeft.toString().padStart(2, "0")}
                </Text>
              </View>
            ) : (
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>STATUS</Text>
                <Text style={[styles.timerDigits, { color: "#00D26A" }]}>
                  ACTIVE
                </Text>
              </View>
            )}
          </View>

          {/* Map Section */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: selectedRideData.pickup?.latitude ?? -17.82,
                longitude: selectedRideData.pickup?.longitude ?? 31.04,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            />
          </View>

          {/* Content Section */}
          <View style={styles.middleSection}>
            <View style={styles.topRow}>
              {/* Left: Passenger Info */}
              <View style={styles.leftCol}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: selectedRideData.passengerPic }}
                    style={styles.passengerPic}
                  />
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={9} color="#fff" />
                    <Text style={styles.ratingBadgeText}>
                      {selectedRideData.passengerRating}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right: Price & Meta */}
              <View style={styles.rightCol}>
                <View style={styles.headerPriceRow}>
                  <Text style={styles.offerText}>${baseOffer?.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.offerBadge,
                      {
                        backgroundColor:
                          selectedRideData.offerType === "good"
                            ? "#00D26A" // Bolt Green
                            : selectedRideData.offerType === "fair"
                              ? "#FFC107"
                              : "#FF4B55",
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {selectedRideData.offerType?.toUpperCase() || "NEW"}
                    </Text>
                  </View>
                </View>

                {/* Metadata Row (Payment | Vehicle | Distance) */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="wallet" size={14} color="#555" />
                    <Text style={styles.metaText}>
                      {selectedRideData.paymentMethod === "ecocash"
                        ? "Ecocash"
                        : "Cash"}
                    </Text>
                  </View>
                  <View style={styles.dotSeparator} />
                  <View style={styles.metaItem}>
                    <Ionicons name="car" size={14} color="#555" />
                    <Text style={styles.metaText}>
                      {selectedRideData.vehicleType?.replace(
                        "seater",
                        " Seater",
                      )}
                    </Text>
                  </View>
                  <View style={styles.dotSeparator} />
                  <View style={styles.metaItem}>
                    <Text style={styles.distanceTextHighlight}>
                      {selectedRideData.distanceKm?.toFixed(1)} km
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Address Visual Timeline */}
            <View style={styles.addressContainer}>
              <View style={styles.timelineConnector} />
              {/* Pickup */}
              <View style={styles.addressItem}>
                <View
                  style={[styles.addressMarker, { backgroundColor: "#00D26A" }]}
                />
                <Text style={styles.addressText} numberOfLines={2}>
                  {selectedRideData.pickup?.address}
                </Text>
              </View>
              {/* Destination */}
              <View style={[styles.addressItem, { marginTop: 14 }]}>
                <View
                  style={[styles.addressMarker, { backgroundColor: "#FF4B55" }]}
                />
                <Text style={styles.addressText} numberOfLines={2}>
                  {selectedRideData.destination?.address}
                </Text>
              </View>
            </View>

            {/* Note Box */}
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>PASSENGER NOTE</Text>
              <Text style={styles.noteContent}>
                {selectedRideData.additionalInfo || "No special requests"}
              </Text>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomSection}>
            {(currentStatus as string) === "submitted" ||
            currentStatus === "submitting" ? (
              <View style={styles.submittedContainer}>
                <View style={styles.boltSuccessCircle}>
                  <Ionicons name="checkmark" size={32} color="#00D26A" />
                </View>
                <Text style={styles.submittedTitle}>Response Submitted</Text>
                <Text style={styles.submittedSubText}>
                  Rider is looking at your{" "}
                  <Text style={{ color: "#2F3337", fontWeight: "800" }}>
                    ${currentOffer.toFixed(2)}
                  </Text>{" "}
                  offer.
                </Text>
              </View>
            ) : (
              <>
                <OfferFareControl
                  minOffer={minOffer}
                  maxOffer={maxOffer}
                  initialOffer={currentOffer}
                  onOfferChange={setCurrentOffer}
                />
                <IRButton
                  title="SUBMIT OFFER"
                  loading={currentStatus === "submitting"}
                  onPress={submitOffer}
                />
              </>
            )}

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleClose}
            >
              <Text style={styles.dismissText}>DISMISS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  },
);

RideRequestTray.displayName = "RideRequestTray";
export default RideRequestTray;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: "#FFFFFF",
    // Radius Removed per request
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 999,
  },

  // Timer Styles
  topProgressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 4,
    zIndex: 10,
  },
  headerArea: {
    alignItems: "center",
    paddingVertical: 12,
  },
  timerContainer: {
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 2,
  },
  timerDigits: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    fontVariant: ["tabular-nums"], // Monospace numbers to prevent jitter
    letterSpacing: -0.5,
  },

  mapContainer: {
    height: OPEN_HEIGHT * 0.28,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    backgroundColor: "#E5E7EB",
  },
  middleSection: { flex: 1 },

  /* Top Row Layout */
  topRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  leftCol: { width: 72, alignItems: "center" },
  avatarWrapper: { position: "relative" },
  passengerPic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ratingBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#2F3337",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  ratingBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 2,
  },

  rightCol: { flex: 1, paddingLeft: 16, justifyContent: "center" },
  headerPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 2,
  },
  offerText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  offerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },

  /* Metadata Row */
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  distanceTextHighlight: {
    fontSize: 13,
    color: "#00D26A",
    fontWeight: "800",
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 10,
  },

  /* Address Timeline */
  addressContainer: {
    position: "relative",
    paddingLeft: 4,
    marginBottom: 10,
  },
  timelineConnector: {
    position: "absolute",
    left: 3.25,
    top: 14,
    bottom: 14,
    width: 1.5,
    backgroundColor: "#E2E8F0",
  },
  addressItem: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  addressMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    zIndex: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
    lineHeight: 20,
  },

  /* Note Box */
  noteBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 5,
  },
  noteContent: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
    lineHeight: 20,
  },

  /* Bottom Section */
  bottomSection: { paddingVertical: 5, gap: 5 },

  /* Submitted State */
  submittedContainer: { alignItems: "center", paddingVertical: 12 },
  boltSuccessCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E6FBF0",
    justifyContent: "center",
    alignItems: "center",
  },
  submittedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  submittedSubText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },

  dismissButton: { alignSelf: "center", paddingVertical: 8 },
  dismissText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
