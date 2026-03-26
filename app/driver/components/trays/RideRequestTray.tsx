import { ms, s, vs } from "@/utils/responsive";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// Detect small screens (e.g., iPhone SE, older Androids)
const isSmallScreen = windowHeight < 700;

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
    const insets = useSafeAreaInsets();
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

    // Responsive Heights
    const OPEN_HEIGHT = isSmallScreen
      ? windowHeight * 0.9
      : windowHeight * 0.82;
    const MAP_MIN_HEIGHT = isSmallScreen ? vs(160) : vs(220);

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

    const vehicleLabel =
      vehicleTypeLabels[selectedRideData?.vehicleType] || "STANDARD";
    const baseHeaderText = `NEW REQUEST - ${vehicleLabel}`;

    const headerText =
      isPriority && secondsLeft > 0
        ? `${baseHeaderText} (EXCLUSIVE • 00:${secondsLeft.toString().padStart(2, "0")})`
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
        socket?.emit("driver:ride_tray_status", { rideId, status: "closed" });
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
      if (selectedRideData?.broadcastType !== "priority" || !expiresAt) return;

      const remainingMs = expiresAt - Date.now();
      const duration = Math.max(0, remainingMs);
      progressAnim.setValue(duration / priorityDurationRef.current);

      Animated.timing(progressAnim, {
        toValue: 0,
        duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      intervalRef.current = setInterval(() => {
        const rem = expiresAt - Date.now();
        const newSeconds = Math.max(0, Math.ceil(rem / 1000));
        setSecondsLeft(newSeconds);
        if (newSeconds <= 0) clearTimers();
      }, 1000);

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
      if (!rideId || !selectedRideData || currentStatus !== "idle") return;
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

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View
          style={[
            styles.container,
            {
              height: OPEN_HEIGHT,
              paddingBottom: Math.max(insets.bottom, vs(20)),
            },
          ]}
        >
          {currentStatus === "idle" && isPriority && secondsLeft > 0 && (
            <Animated.View
              style={[
                styles.topProgressBar,
                { width: progressWidth, backgroundColor: progressColor },
              ]}
            />
          )}

          <View style={styles.headerArea}>
            <View style={styles.dragHandle} />
            <Text style={styles.timerDigits}>{headerText}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={{ paddingBottom: vs(20) }}
          >
            <View style={[styles.mapWrapper, { height: MAP_MIN_HEIGHT }]}>
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
                  size={ms(50)}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.passengerName} numberOfLines={1}>
                    {selectedRideData.passengerName || "Passenger"}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons
                      name="star"
                      size={ms(12)}
                      color={theme.colors.warning}
                    />
                    <Text style={styles.ratingValueText}>
                      {rating.toFixed(1)}
                    </Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.tripCountText}>
                      {selectedRideData.passengerTrips || "0"} trips
                    </Text>
                  </View>
                </View>

                <View style={styles.priceContainer}>
                  <Text style={styles.mainPrice}>${baseOffer?.toFixed(2)}</Text>
                  <Text style={styles.paymentMethodText}>
                    {(selectedRideData.paymentMethod || "CASH").toUpperCase()}
                  </Text>
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
                  <Text style={styles.addressText} numberOfLines={1}>
                    {selectedRideData.pickup?.address}
                  </Text>
                </View>
                <View style={[styles.addressRow, { marginTop: vs(10) }]}>
                  <View
                    style={[styles.dot, { backgroundColor: theme.colors.red }]}
                  />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {selectedRideData.destination?.address}
                  </Text>
                </View>
              </View>

              <View style={styles.noteContainer}>
                <Ionicons
                  name="information-circle"
                  size={ms(14)}
                  color="#64748B"
                />
                <Text style={styles.noteText}>
                  {selectedRideData.additionalInfo || "No instructions."}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomSection}>
            {["submitted", "submitting"].includes(currentStatus as string) ? (
              <View style={styles.successState}>
                <View style={styles.checkCircle}>
                  <Ionicons
                    name="checkmark"
                    size={ms(30)}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.successTitle}>Offer Sent</Text>
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
                  title={`ACCEPT $${currentOffer.toFixed(2)}`}
                  loading={currentStatus === "submitting"}
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
    zIndex: 9998,
    elevation: 9998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    paddingHorizontal: s(20),
    zIndex: 9999,
    elevation: 9999,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
    overflow: "hidden",
  },
  dragHandle: {
    width: s(35),
    height: vs(4),
    backgroundColor: "#E2E8F0",
    borderRadius: ms(2),
    marginBottom: vs(8),
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
    paddingTop: vs(12),
    paddingBottom: vs(8),
  },
  timerDigits: {
    fontSize: ms(11),
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
  },
  scrollArea: { flex: 1 },
  mapWrapper: {
    borderRadius: ms(16),
    overflow: "hidden",
    marginBottom: vs(12),
  },
  middleSection: { flex: 1 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(10),
  },
  profileInfo: { flex: 1, marginLeft: s(10) },
  passengerName: { fontSize: ms(17), fontWeight: "800", color: "#0F172A" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: vs(2) },
  ratingValueText: {
    fontSize: ms(11),
    fontWeight: "700",
    color: "#64748b",
    marginLeft: s(3),
  },
  tripCountText: { fontSize: ms(11), color: "#94a3b8", fontWeight: "600" },
  dotSeparator: {
    width: s(3),
    height: s(3),
    borderRadius: 1.5,
    backgroundColor: "#cbd5e1",
    marginHorizontal: s(5),
  },
  priceContainer: { alignItems: "flex-end" },
  mainPrice: {
    fontSize: ms(22),
    fontWeight: "900",
    color: theme.colors.primary,
  },
  paymentMethodText: { fontSize: ms(11), fontWeight: "600", color: "#64748B" },
  addressSection: { marginVertical: vs(10), paddingLeft: s(5) },
  timelineLine: {
    position: "absolute",
    left: s(8),
    top: vs(15),
    bottom: vs(15),
    width: 1,
    backgroundColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  addressRow: { flexDirection: "row", alignItems: "center", gap: s(10) },
  dot: { width: s(7), height: s(7), borderRadius: 3.5 },
  addressText: {
    fontSize: ms(13),
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  noteContainer: {
    flexDirection: "row",
    gap: s(6),
    backgroundColor: "#F8FAFC",
    padding: s(10),
    borderRadius: ms(10),
  },
  noteText: {
    fontSize: ms(11),
    color: "#64748B",
    fontStyle: "italic",
    flex: 1,
  },
  bottomSection: { gap: vs(8), marginTop: vs(10) },
  successState: { alignItems: "center", paddingVertical: vs(10) },
  checkCircle: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: "#E6FBF0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(5),
  },
  successTitle: { fontSize: ms(16), fontWeight: "800", color: "#0F172A" },
});
RideRequestTray.displayName = "RideRequestTray";
export default RideRequestTray;
