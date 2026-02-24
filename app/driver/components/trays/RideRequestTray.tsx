import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants"; // Added for API Key
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"; // Added Marker
import MapViewDirections from "react-native-maps-directions"; // Added Directions
import { IRAvatar } from "../../../../components/IRAvatar";
import { IRButton } from "../../../../components/IRButton";
import { theme } from "../../../../constants/theme"; // Assuming theme is available for route color
import { SubmissionState } from "../../index";
import { OfferFareControl } from "../DriverOfferFareControl";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = windowHeight * 0.88;
const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey; // API Key

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
    const mapRef = useRef<MapView>(null); // Ref for zooming map
    const [isOpen, setIsOpen] = useState(false);
    const [rideId, setRideId] = useState<string | null>(null);
    const [selectedRideData, setSelectedRideData] = useState<any>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const [currentOffer, setCurrentOffer] = useState(0);
    const [currentStatus, setCurrentStatus] = useState<SubmissionState>("idle");

    const progressAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const baseOffer = selectedRideData?.offer ?? 0;
    const minOffer = selectedRideData?.priceRange?.min ?? baseOffer;
    const maxOffer = selectedRideData?.priceRange?.max ?? baseOffer;

    const clearTimers = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const vehicleTypeLabels: Record<string, string> = {
      "4seater": "4 SEATER",
      "7seater": "7 SEATER",
      pickup2seater: "2 SEATER PICKUP",
      pickup4seater: "4 SEATER PICKUP",
    };

    // Automatically fit map to the route when tray opens
    useEffect(() => {
      if (isOpen && selectedRideData?.pickup && selectedRideData?.destination) {
        // Short delay to allow the tray to "settle" before zooming
        const timeout = setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            [selectedRideData.pickup, selectedRideData.destination],
            {
              edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
              animated: true,
            },
          );
        }, 500);
        return () => clearTimeout(timeout);
      }
    }, [isOpen, selectedRideData]);

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

          if (status === ("idle" as any)) {
            progressAnim.setValue(currentProgress ?? 1);
            Animated.timing(progressAnim, {
              toValue: 0,
              duration: remainingMs,
              easing: Easing.linear,
              useNativeDriver: false,
            }).start();

            const initialSeconds = Math.ceil(remainingMs / 1000);
            setSecondsLeft(initialSeconds);

            clearTimers();
            timerRef.current = setTimeout(handleClose, remainingMs);
            intervalRef.current = setInterval(() => {
              setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
            }, 1000);
          }
        },
        close: handleClose,
      }),
      [handleClose, progressAnim],
    );

    const submitOffer = () => {
      if (!rideId || !selectedRideData || (currentStatus as string) !== "idle")
        return;

      onOfferSubmitted(rideId, currentOffer, baseOffer);
      setCurrentStatus("submitted" as any);
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
      outputRange: ["#EF4444", "#F59E0B", "#32D74B"],
    });

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          {(currentStatus as string) === "idle" && (
            <Animated.View
              style={[
                styles.topProgressBar,
                { width: progressWidth, backgroundColor: progressColor },
              ]}
            />
          )}
          <View style={styles.headerArea}>
            <View style={styles.handle} />
            <Text style={styles.timerDigits}>
              {(currentStatus as string) === "idle"
                ? `NEW REQUEST - ${vehicleTypeLabels[selectedRideData.vehicleType] || "Ride"} • 00:${secondsLeft
                    .toString()
                    .padStart(2, "0")}`
                : "OFFER PENDING"}
            </Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={[styles.mapContainer, { flex: 1, minHeight: 160 }]}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: selectedRideData.pickup?.latitude ?? -17.82,
                  longitude: selectedRideData.pickup?.longitude ?? 31.04,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {selectedRideData.pickup && selectedRideData.destination && (
                  <>
                    <MapViewDirections
                      origin={selectedRideData.pickup}
                      destination={selectedRideData.destination}
                      apikey={GOOGLE_MAPS_APIKEY}
                      strokeWidth={3}
                      strokeColor={theme?.colors?.primary || "#10B981"}
                    />
                    <Marker coordinate={selectedRideData.pickup}>
                      <View
                        style={[styles.mapDot, { backgroundColor: "#00D26A" }]}
                      />
                    </Marker>
                    <Marker coordinate={selectedRideData.destination}>
                      <View
                        style={[styles.mapDot, { backgroundColor: "#FF4B55" }]}
                      />
                    </Marker>
                  </>
                )}
              </MapView>
            </View>

            <View style={styles.middleSection}>
              <View style={styles.profileRow}>
                <View style={styles.avatarContainer}>
                  <IRAvatar
                    source={
                      selectedRideData.passengerPic
                        ? { uri: selectedRideData.passengerPic }
                        : undefined
                    }
                    name={selectedRideData.passengerName}
                    size={54}
                  />
                </View>

                <View style={styles.profileInfo}>
                  <Text style={styles.passengerName}>
                    {selectedRideData.passengerName || "Passenger"}
                  </Text>

                  <View style={styles.ratingRow}>
                    <View style={{ flexDirection: "row", gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={
                            i <=
                            Math.round(selectedRideData.passengerRating || 5)
                              ? "star"
                              : "star-outline"
                          }
                          size={10}
                          color={
                            i <=
                            Math.round(selectedRideData.passengerRating || 5)
                              ? "#FFC107"
                              : "#cbd5e1"
                          }
                        />
                      ))}
                    </View>

                    <Text style={styles.ratingValueText}>
                      (
                      {parseFloat(
                        selectedRideData.passengerRating || "5",
                      ).toFixed(2)}
                      )
                    </Text>

                    <View style={styles.dotSeparator} />

                    <Text style={styles.tripCountText}>
                      {selectedRideData.passengerTrips || "0"} trips
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.priceContainer,
                    { flexDirection: "row", alignItems: "center", gap: 8 },
                  ]}
                >
                  <Text style={styles.mainPrice}>${baseOffer?.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.offerBadge,
                      {
                        backgroundColor:
                          selectedRideData.offerType === "good"
                            ? "#E6FBF0"
                            : "#FFF4E5",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            selectedRideData.offerType === "good"
                              ? "#00D26A"
                              : "#FF9500",
                        },
                      ]}
                    >
                      {selectedRideData.offerType?.toUpperCase() || "NEW"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Ionicons name="navigate-circle" size={16} color="#64748B" />
                  <Text style={styles.statValue}>
                    {selectedRideData.rideDistanceKm?.toFixed(1)} km
                  </Text>
                  <Text style={styles.statLabel}>Trip</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="car" size={16} color="#64748B" />
                  <Text style={styles.statValue}>
                    {parseFloat(
                      selectedRideData.pickupDistanceKm || "0",
                    ).toFixed(2)}{" "}
                    km
                  </Text>
                  <Text style={styles.statLabel}>Pickup</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="wallet" size={16} color="#64748B" />
                  <Text style={styles.statValue}>
                    {selectedRideData.paymentMethod === "ecocash"
                      ? "Eco"
                      : "Cash"}
                  </Text>
                  <Text style={styles.statLabel}>Pay</Text>
                </View>
              </View>

              <View style={styles.addressSection}>
                <View style={styles.timelineLine} />
                <View style={styles.addressRow}>
                  <View style={[styles.dot, { backgroundColor: "#00D26A" }]} />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabelSmall}>PICKUP</Text>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {selectedRideData.pickup?.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.addressRow, { marginTop: 12 }]}>
                  <View style={[styles.dot, { backgroundColor: "#FF4B55" }]} />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressLabelSmall}>DESTINATION</Text>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {selectedRideData.destination?.address}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.noteContainer}>
                <Ionicons name="information-circle" size={14} color="#64748B" />
                <Text style={styles.noteText}>
                  {selectedRideData.additionalInfo ||
                    "No special instructions provided."}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomSection}>
            {(currentStatus as string) === "submitted" ||
            (currentStatus as string) === "submitting" ? (
              <View style={styles.successState}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={32} color="#00D26A" />
                </View>
                <Text style={styles.successTitle}>Offer Submitted</Text>
                <Text style={styles.successSub}>
                  Rider is reviewing your ${currentOffer.toFixed(2)} offer.
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
                  title={`ACCEPT FOR $${currentOffer.toFixed(2)}`}
                  loading={(currentStatus as string) === "submitting"}
                  onPress={submitOffer}
                />
              </>
            )}

            <IRButton title="CLOSE" variant="outline" onPress={handleClose} />
          </View>
        </View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    zIndex: 998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 999,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
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
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 8,
  },
  timerDigits: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  mapContainer: {
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  mapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  middleSection: {
    flex: 1,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {},
  profileInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  passengerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginLeft: 4,
  },
  tripCountText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 6,
  },
  priceContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mainPrice: {
    fontSize: 24,
    fontWeight: "900",
    color: "#10B981",
  },
  offerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  statsStrip: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#E2E8F0",
  },
  addressSection: {
    paddingLeft: 8,
    marginBottom: 10,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 11.5,
    top: 20,
    bottom: 20,
    width: 1.5,
    backgroundColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 18,
  },
  addressTextContainer: {
    flex: 1,
    paddingVertical: 4,
  },
  addressLabelSmall: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 18,
  },
  noteContainer: {
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#F1F5F9",
    padding: 10,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 16,
  },
  bottomSection: {
    gap: 10,
    paddingTop: 10,
  },
  successState: {
    alignItems: "center",
    paddingVertical: 15,
  },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E6FBF0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  successSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
});

RideRequestTray.displayName = "RideRequestTray";
export default RideRequestTray;
