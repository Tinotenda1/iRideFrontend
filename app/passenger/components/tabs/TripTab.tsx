// app/passenger/components/tabs/TripTab.tsx
import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { ActionConfirmationModal } from "../../../../components/ActionConfirmationModal";
import CancelButton from "../../../../components/CancelButton";
import { IRAvatar } from "../../../../components/IRAvatar";
import { IRButton } from "../../../../components/IRButton";
import { theme } from "../../../../constants/theme";
import { getUserInfo } from "../../../../utils/storage";
import { createStyles } from "../../../../utils/styles";
import { subscribeToRideCancellation } from "../../socketConnectionUtility/passengerSocketService";

interface TripTabProps {
  onCancel: () => void;
  onExpand?: (isExpanded: boolean) => void;
}

const PREDEFINED_REASONS = [
  "Wait time too long",
  "Driver is not moving",
  "Driver asked me to cancel",
  "Incorrect pickup address",
  "No longer need the ride",
  "Emergency / Drop me here",
];

const TripTab: React.FC<TripTabProps> = ({ onCancel, onExpand }) => {
  const { currentRide, rideData } = useRideBooking();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [remoteCancelData, setRemoteCancelData] = useState<{
    reason: string;
    cancelledBy: string;
  } | null>(null);

  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isOn_trip =
    rideData.status === "on_trip" || currentRide?.status === "on_trip";
  const driver = currentRide?.driver;
  const vehicle = currentRide?.driver?.vehicle;
  const profilePic = driver?.profilePic;
  const totalTrips = driver?.totalTrips;
  const rating = currentRide?.driver?.rating;
  const vehiclePic = vehicle?.pic;
  const vehicleLicencePlate = vehicle?.licensePlate;
  const displayOffer = currentRide?.offer;
  const [showDropModal, setShowDropModal] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    subscribeToRideCancellation((data) => {
      if (data.cancelledBy === "driver" && isMounted.current) {
        setRemoteCancelData(data);
      }
    });
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    onExpand?.(nextState);

    Animated.timing(fadeAnim, {
      toValue: nextState ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirmCancel = useCallback(async () => {
    if (!isMounted.current || isCancelling) return;
    setIsCancelling(true);
    try {
      const userInfo = await getUserInfo();
      const formattedPhone = userInfo?.phone?.replace("+", "") || "";

      await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": userInfo?.currentDeviceId || userInfo?.deviceId || "",
        },
        body: JSON.stringify({
          userPhone: formattedPhone,
          reason:
            cancelReason ||
            (isExpanded
              ? "Passenger requested immediate stop (Drop me here)"
              : "No reason provided."),
        }),
      });

      onCancel();
      if (isMounted.current) {
        setShowCancelModal(false);
        setIsExpanded(false);
      }
    } catch (error) {
      console.error("❌ Cancel failed:", error);
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, cancelReason, isExpanded]);

  const handleDropMeHere = useCallback(async () => {
    if (!isMounted.current || isCancelling) return;

    const rId = currentRide?.rideId || rideData?.activeTrip?.rideId;
    if (!rId) {
      Alert.alert("Error", "Could not find an active trip ID.");
      return;
    }

    setIsCancelling(true);
    try {
      const userInfo = await getUserInfo();
      const formattedPhone = userInfo?.phone?.replace("+", "") || "";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/passenger_ends_ride`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id":
              userInfo?.currentDeviceId || userInfo?.deviceId || "",
          },
          body: JSON.stringify({
            userPhone: formattedPhone,
            rideId: rId,
            completedBy: "passenger",
            reason: "Drop me here (Immediate stop requested)",
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setShowDropModal(false);
        onCancel();
        if (isMounted.current) setIsExpanded(false);
      } else {
        Alert.alert("Request Failed", "The server could not end the trip.");
      }
    } catch (error) {
      console.error("❌ Drop me here failed:", error);
      Alert.alert(
        "Connection Error",
        "Please check your internet connection and try again.",
      );
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, currentRide, rideData]);

  const handleCallDriver = () => {
    if (!driver?.phone) {
      Alert.alert("Error", "Passenger phone number is not available.");
      return;
    }
    const phoneNumber = "+" + driver.phone.replace(/\D/g, "");
    let url =
      Platform.OS === "android"
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert("Error", "Unable to open dialer.");
      })
      .catch((err) => console.error("Dialer error:", err));
  };

  const handleWhatsAppDriver = async () => {
    try {
      if (!driver?.phone) {
        Alert.alert("Error", "Driver phone number is not available.");
        return;
      }
      const phoneNumber = "+" + driver.phone.replace(/\D/g, "");
      const userInfo = await getUserInfo();
      const passengerName = userInfo
        ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim()
        : "Passenger";

      const message = encodeURIComponent(`DRIFT Passenger - ${passengerName}:`);
      const url = `https://wa.me/${phoneNumber}?text=${message}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else
        Alert.alert(
          "WhatsApp not installed",
          "Please install WhatsApp to send a message.",
        );
    } catch (err) {
      console.error("WhatsApp error:", err);
    }
  };

  const handleCloseRemoteModal = () => {
    setRemoteCancelData(null);
    onCancel();
  };

  if (!driver?.name) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={styles.loadingText}>Connecting to driver...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {isOn_trip && (
          <View style={styles.headerRow}>
            <View style={styles.ongoingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.ongoingText}>Trip in Progress</Text>
            </View>
            <TouchableOpacity
              style={styles.expandToggle}
              onPress={handleToggleExpand}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-up"}
                size={ms(24)}
                color="#475569"
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.driverRow}>
          <View style={styles.driverInfo}>
            <IRAvatar
              source={profilePic ? { uri: profilePic } : undefined}
              size={ms(52)}
            />
            <View>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingBadge}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const safeRating = typeof rating === "number" ? rating : 5;
                  return (
                    <Ionicons
                      key={i}
                      name="star"
                      size={ms(12)}
                      color={i < Math.round(safeRating) ? "#FFC107" : "#E5E7EB"}
                      style={{ marginRight: s(1) }}
                    />
                  );
                })}
                <Text style={styles.ratingText}>
                  {typeof rating === "number" ? rating.toFixed(2) : "5.00"}
                </Text>
                <Text style={styles.tripCount}> • {totalTrips} rides</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.secondary },
            ]}
            onPress={handleCallDriver}
          >
            <Ionicons name="call" size={ms(22)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: "#25D366" }]}
            activeOpacity={0.7}
            onPress={handleWhatsAppDriver}
          >
            <Ionicons name="logo-whatsapp" size={ms(22)} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleInfo}>
            <IRAvatar
              source={vehiclePic ? { uri: vehiclePic } : undefined}
              variant="rounded"
              size={ms(50)}
              style={{ backgroundColor: "#f8fafc" }}
            />
            <View>
              <Text style={styles.carModel}>
                {vehicle?.color} {vehicle?.model}
              </Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateNumber}>
                  {vehicleLicencePlate || "No Plate"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              ${Number(displayOffer).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {!isOn_trip ? (
          <CancelButton
            label="Cancel ride"
            onPress={() => setShowCancelModal(true)}
          />
        ) : (
          <View style={{ gap: vs(10), paddingBottom: vs(20) }}>
            <IRButton
              title="Safety Toolkit"
              variant="outline"
              onPress={() => {}}
              leftIcon={
                <Ionicons
                  name="shield-checkmark"
                  size={ms(20)}
                  color="#007AFF"
                />
              }
              style={styles.safetyButton}
              textStyle={styles.safetyButtonText}
              borderColor="#E2E8F0"
            />
            {isExpanded && (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [vs(10), 0],
                      }),
                    },
                  ],
                }}
              >
                <IRButton
                  title="Drop me here"
                  variant="outline"
                  onPress={() => setShowDropModal(true)}
                  loading={isCancelling}
                  borderColor="#fee2e2"
                  style={styles.dropButton}
                  textStyle={styles.dropButtonText}
                />
              </Animated.View>
            )}
          </View>
        )}
      </View>

      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Cancel ride?</Text>
            <Text style={styles.modalSubtitle}>
              Please let us know why you are cancelling
            </Text>
            <View style={styles.reasonContainer}>
              {PREDEFINED_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    cancelReason === reason && styles.reasonChipActive,
                  ]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      cancelReason === reason && styles.reasonChipTextActive,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reasonInput}
              placeholder="Other reason..."
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalActions}>
              <IRButton
                title="Keep ride"
                onPress={() => setShowCancelModal(false)}
              />
              <IRButton
                title="Confirm Cancellation"
                variant="ghost"
                onPress={handleConfirmCancel}
                loading={isCancelling}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!remoteCancelData} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.remoteModalPadding]}>
            <View style={styles.alertCircle}>
              <Ionicons name="alert-circle" size={ms(36)} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Trip Cancelled</Text>
            <Text style={styles.modalSubtitle}>
              The driver has cancelled this request.
            </Text>
            <View style={styles.reasonDisplayBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonValue}>
                {remoteCancelData?.reason || "No reason provided"}
              </Text>
            </View>
            <IRButton title="Back to Home" onPress={handleCloseRemoteModal} />
          </View>
        </View>
      </Modal>

      <ActionConfirmationModal
        visible={showDropModal}
        title="End trip early?"
        subtitle="Are you sure you want the driver to stop here? You will be charged for the distance covered."
        confirmText="Yes, Drop Me Here"
        confirmVariant="danger"
        loading={isCancelling}
        onConfirm={handleDropMeHere}
        onClose={() => setShowDropModal(false)}
      />
    </View>
  );
};

const styles = createStyles({
  container: {
    flex: 1,
    paddingTop: vs(15),
    backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingHorizontal: s(16),
  },
  topSection: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(12),
  },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: vs(10),
    color: "#94a3b8",
    fontSize: ms(14),
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverInfo: { flexDirection: "row", alignItems: "center", gap: s(10) },
  driverName: { fontSize: ms(18), fontWeight: "700", color: "#1e293b" },
  ratingBadge: { flexDirection: "row", alignItems: "center", marginTop: vs(2) },
  ratingText: {
    fontSize: ms(13),
    fontWeight: "700",
    marginLeft: s(4),
    color: "#1e293b",
  },
  tripCount: { fontSize: ms(13), color: "#94a3b8", fontWeight: "500" },
  iconButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: vs(10),
  },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: s(12) },
  pulseDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: "#10B981",
    marginRight: s(6),
  },
  safetyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: ms(16),
    borderWidth: 1,
    height: vs(56),
    justifyContent: "center",
  },
  safetyButtonText: { fontSize: ms(16), fontWeight: "700", color: "#475569" },
  dropButton: {
    backgroundColor: "#fef2f2",
    height: vs(56),
    borderRadius: ms(16),
  },
  dropButtonText: { color: "#ef4444", fontWeight: "700", fontSize: ms(16) },
  carModel: {
    fontSize: ms(15),
    fontWeight: "600",
    color: "#475569",
    marginBottom: vs(2),
  },
  plateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: s(6),
    paddingVertical: vs(2),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignSelf: "flex-start",
  },
  plateNumber: {
    fontSize: ms(11),
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  pricePill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(12),
  },
  priceText: { fontSize: ms(18), fontWeight: "800", color: "#10B981" },
  footer: { marginTop: "auto" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    padding: s(24),
    paddingBottom: vs(40),
  },
  modalIndicator: {
    width: s(40),
    height: vs(4),
    backgroundColor: "#e2e8f0",
    borderRadius: ms(2),
    alignSelf: "center",
    marginBottom: vs(20),
  },
  modalTitle: {
    fontSize: ms(24),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(4),
  },
  modalSubtitle: { fontSize: ms(15), color: "#64748b", marginBottom: vs(20) },
  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: s(8),
    marginBottom: vs(16),
  },
  reasonChip: {
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
    borderRadius: ms(12),
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  reasonChipActive: { backgroundColor: "#ecfdf5", borderColor: "#10B981" },
  reasonChipText: { fontSize: ms(13), fontWeight: "600", color: "#475569" },
  reasonChipTextActive: { color: "#10B981" },
  reasonInput: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: ms(16),
    padding: s(16),
    fontSize: ms(15),
    color: "#1e293b",
    minHeight: vs(80),
    textAlignVertical: "top",
    marginBottom: vs(24),
  },
  modalActions: { width: "100%", gap: vs(12) },
  remoteModalPadding: {
    alignItems: "center",
    borderTopLeftRadius: ms(40),
    borderTopRightRadius: ms(40),
  },
  alertCircle: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(16),
  },
  reasonDisplayBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    padding: s(20),
    borderRadius: ms(20),
    marginBottom: vs(30),
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reasonLabel: {
    fontSize: ms(12),
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: vs(4),
  },
  reasonValue: {
    fontSize: ms(16),
    color: "#334155",
    fontWeight: "600",
    fontStyle: "italic",
  },
  ongoingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    alignSelf: "flex-start",
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(20),
  },
  ongoingText: {
    fontSize: ms(12),
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
  },
  expandToggle: { padding: s(4) },
});

export default TripTab;
