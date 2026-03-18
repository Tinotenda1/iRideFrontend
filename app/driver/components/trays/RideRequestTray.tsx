// app/driver/components/trays/RideRequestTray.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView from "react-native-maps";
import { IRAvatar } from "../../../../components/IRAvatar";
import { IRButton } from "../../../../components/IRButton";
import { theme } from "../../../../constants/theme";
import {
  DriverLocation,
  watchDriverLocation,
} from "../../driverLocationUtility/driverLocation";
import { SubmissionState } from "../../index";
import { getDriverSocket } from "../../socketConnectionUtility/driverSocketService";
import { OfferFareControl } from "../DriverOfferFareControl";
import RideRequestMap from "../maps/RideRequestMap";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = vs(windowHeight * 0.8);
const MAP_MIN_HEIGHT = vs(windowHeight * 0.35); // Adjusted slightly for better responsive flow

export interface RideRequestTrayRef {
  open: (
    rideId: string,
    priorityDurationMs: number,
    remainingMs: number,
    existingOffer: number | null,
    status: SubmissionState,
    rideData: any,
    priority?: boolean,
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
    const mapRef = useRef<MapView>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [rideId, setRideId] = useState<string | null>(null);
    const [selectedRideData, setSelectedRideData] = useState<any>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const isPriority = selectedRideData?.broadcastType === "priority";

    const [currentOffer, setCurrentOffer] = useState(0);
    const [currentStatus, setCurrentStatus] = useState<SubmissionState>("idle");

    const progressAnim = useRef(new Animated.Value(1)).current;
    const priorityDurationRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const baseOffer = selectedRideData?.offer ?? 0;
    const minOffer = selectedRideData?.priceRange?.min ?? baseOffer;
    const maxOffer = selectedRideData?.priceRange?.max ?? baseOffer;

    const [currentDriverLocation, setCurrentDriverLocation] =
      useState<DriverLocation | null>(null);

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

    const vehicleType = selectedRideData?.vehicleType;
    const vehicleLabel = vehicleTypeLabels[vehicleType] || "STANDARD";
    const baseHeaderText = `NEW REQUEST - ${vehicleLabel}`;

    const headerText =
      isPriority && secondsLeft > 0
        ? `${baseHeaderText} (EXCLUSIVE WINDOW • 00:${secondsLeft
            .toString()
            .padStart(2, "0")})`
        : baseHeaderText;

    useEffect(() => {
      const unsubscribe = watchDriverLocation(
        (location) => setCurrentDriverLocation(location),
        (error) => console.error("Location Tracking Error:", error),
      );
      return () => unsubscribe();
    }, []);

    const handleClose = useCallback(() => {
      try {
        const socket = getDriverSocket();
        socket?.emit("driver:ride_tray_status", {
          rideId,
          status: "closed",
        });
      } catch (err) {
        console.warn("Tray close socket emit failed", err);
      }
      clearTimers();
      progressAnim.stopAnimation();
      setIsOpen(false);
      setRideId(null);
      setSelectedRideData(null);
      setExpiresAt(null);
      setCurrentStatus("idle");
      onClose?.();
    }, [onClose, progressAnim, rideId]);

    useImperativeHandle(
      ref,
      () => ({
        open: (
          rideId,
          priorityDurationMs,
          remainingMs,
          existingOffer,
          status,
          rideData,
        ) => {
          setRideId(rideId);
          setSelectedRideData(rideData);
          setExpiresAt(Date.now() + Math.max(0, remainingMs));
          setCurrentStatus(status);
          setCurrentOffer(existingOffer ?? rideData.offer);
          priorityDurationRef.current = priorityDurationMs;
          progressAnim.setValue(remainingMs / priorityDurationMs);
          setSecondsLeft(Math.ceil(Math.max(0, remainingMs) / 1000));

          try {
            const socket = getDriverSocket();
            socket?.emit("driver:ride_tray_status", {
              rideId,
              status: "opened",
            });
          } catch (err) {
            console.warn("Tray open socket emit failed", err);
          }
          setIsOpen(true);
        },
        close: handleClose,
      }),
      [handleClose, progressAnim],
    );

    useEffect(() => {
      if (!isOpen || !rideId || currentStatus !== "idle") return;

      const isPriorityRide = selectedRideData?.broadcastType === "priority";
      if (!isPriorityRide || !expiresAt) return;

      const updateProgress = () => {
        const remainingMs = expiresAt - Date.now();
        const duration = Math.max(0, remainingMs);

        progressAnim.setValue(duration / priorityDurationRef.current);

        Animated.timing(progressAnim, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        }).start();

        setSecondsLeft(Math.ceil(duration / 1000));

        intervalRef.current = setInterval(() => {
          const rem = expiresAt - Date.now();
          const newSeconds = Math.max(0, Math.ceil(rem / 1000));
          setSecondsLeft(newSeconds);

          if (newSeconds <= 0) {
            clearTimers();
          }
        }, 1000);
      };
      updateProgress();

      return () => {
        clearTimers();
        progressAnim.stopAnimation();
      };
    }, [
      isOpen,
      rideId,
      expiresAt,
      selectedRideData,
      currentStatus,
      progressAnim,
    ]);

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
      outputRange: [
        theme.colors.red,
        theme.colors.warning,
        theme.colors.primary,
      ],
    });

    const rating = parseFloat(selectedRideData?.passengerRating || "5");
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          {currentStatus === "idle" && isPriority && secondsLeft > 0 && (
            <Animated.View
              style={[
                styles.topProgressBar,
                { width: progressWidth, backgroundColor: progressColor },
              ]}
            />
          )}
          <View style={styles.headerArea}>
            <Text style={styles.timerDigits}>{headerText}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View
              style={{
                minHeight: MAP_MIN_HEIGHT,
                borderRadius: ms(16),
                overflow: "hidden",
              }}
            >
              <RideRequestMap
                rideData={selectedRideData}
                driverLocation={currentDriverLocation || undefined}
                minHeight={MAP_MIN_HEIGHT}
              />
            </View>

            <View style={styles.middleSection}>
              <View style={styles.profileRow}>
                <IRAvatar
                  source={
                    selectedRideData.passengerPic
                      ? { uri: selectedRideData.passengerPic }
                      : undefined
                  }
                  name={selectedRideData.passengerName}
                  size={ms(54)}
                />

                <View style={styles.profileInfo}>
                  <Text style={styles.passengerName}>
                    {selectedRideData.passengerName || "Passenger"}
                  </Text>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }).map((_, index) => {
                      if (index < fullStars) {
                        return (
                          <Ionicons
                            key={index}
                            name="star"
                            size={ms(12)}
                            color={theme.colors.warning}
                          />
                        );
                      }
                      if (index === fullStars && hasHalfStar) {
                        return (
                          <Ionicons
                            key={index}
                            name="star-half"
                            size={ms(12)}
                            color={theme.colors.warning}
                          />
                        );
                      }
                      return (
                        <Ionicons
                          key={index}
                          name="star-outline"
                          size={ms(12)}
                          color={theme.colors.warning}
                        />
                      );
                    })}
                    <Text
                      style={[styles.ratingValueText, { marginLeft: s(4) }]}
                    >
                      {rating.toFixed(2)}
                    </Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.tripCountText}>
                      {selectedRideData.passengerTrips || "0"} trips
                    </Text>
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.mainPrice}>
                      ${baseOffer?.toFixed(2)}
                    </Text>
                    <Text style={{ marginHorizontal: s(6), color: "#999" }}>
                      •
                    </Text>
                    <Text style={styles.paymentMethodText}>
                      {(selectedRideData.paymentMethod || "CASH").toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.offerBadge,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            selectedRideData.offerType === "good"
                              ? theme.colors.primary
                              : theme.colors.warning,
                        },
                      ]}
                    >
                      {selectedRideData.offerType?.toUpperCase() || "NEW"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.addressSection}>
                <View style={styles.timelineLine} />
                <View style={styles.addressRow}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {selectedRideData.pickup?.address}
                    </Text>
                  </View>
                </View>
                <View style={[styles.addressRow, { marginTop: vs(12) }]}>
                  <View
                    style={[styles.dot, { backgroundColor: theme.colors.red }]}
                  />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {selectedRideData.destination?.address}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.noteContainer}>
                <Ionicons
                  name="information-circle"
                  size={ms(14)}
                  color={theme.colors.background}
                />
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
                  <Ionicons
                    name="checkmark"
                    size={ms(32)}
                    color={theme.colors.primary}
                  />
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
    paddingHorizontal: s(20),
    paddingBottom: vs(24),
    zIndex: 9999,
    elevation: 9999,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    overflow: "hidden",
  },
  topProgressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: vs(4),
    zIndex: 10,
  },
  headerArea: {
    alignItems: "center",
    paddingVertical: vs(12),
  },
  timerDigits: {
    fontSize: ms(12),
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  scrollArea: {
    flex: 1,
  },
  middleSection: {
    flex: 1,
    paddingTop: vs(15),
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: s(12),
    justifyContent: "center",
  },
  passengerName: {
    fontSize: ms(18),
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: vs(2),
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValueText: {
    fontSize: ms(11),
    fontWeight: "700",
    color: "#64748b",
    marginLeft: s(4),
  },
  tripCountText: {
    fontSize: ms(11),
    color: "#94a3b8",
    fontWeight: "600",
  },
  dotSeparator: {
    width: s(3),
    height: s(3),
    borderRadius: ms(1.5),
    backgroundColor: "#cbd5e1",
    marginHorizontal: s(6),
  },
  priceContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  mainPrice: {
    fontSize: ms(24),
    fontWeight: "900",
    color: theme.colors.primary,
  },
  offerBadge: {
    paddingHorizontal: s(6),
    paddingVertical: vs(2),
    borderRadius: ms(4),
  },
  badgeText: {
    fontSize: ms(9),
    fontWeight: "900",
  },
  paymentMethodText: {
    fontSize: ms(13),
    fontWeight: "600",
    color: "#555",
  },
  addressSection: {
    paddingLeft: s(8),
    marginVertical: vs(10),
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: s(11.5),
    top: vs(20),
    bottom: vs(20),
    width: 1.5,
    backgroundColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(10),
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: ms(4),
    marginTop: vs(8),
  },
  addressTextContainer: {
    flex: 1,
    paddingVertical: vs(4),
  },
  addressText: {
    fontSize: ms(14),
    fontWeight: "600",
    color: "#334155",
    lineHeight: ms(18),
  },
  noteContainer: {
    flexDirection: "row",
    gap: s(5),
    backgroundColor: "#F1F5F9",
    padding: s(10),
    borderRadius: ms(10),
    alignItems: "flex-start",
  },
  noteText: {
    fontSize: ms(12),
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
    lineHeight: ms(16),
  },
  bottomSection: {
    gap: vs(10),
    paddingTop: vs(10),
  },
  successState: {
    alignItems: "center",
    paddingVertical: vs(15),
  },
  checkCircle: {
    width: s(56),
    height: s(56),
    borderRadius: ms(28),
    backgroundColor: "#E6FBF0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(10),
  },
  successTitle: {
    fontSize: ms(18),
    fontWeight: "800",
    color: "#0F172A",
  },
  successSub: {
    fontSize: ms(14),
    color: "#64748B",
    marginTop: vs(2),
    textAlign: "center",
  },
});

RideRequestTray.displayName = "RideRequestTray";
export default RideRequestTray;
