// app/passenger/components/tabs/TripTab.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
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
import { getUserInfo } from "../../../../utils/storage";
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
  "Emergency / Drop me here", // Added relevant reason
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

  const driver = rideData?.activeTrip?.driver || currentRide?.driver;
  const vehicle = rideData?.activeTrip?.vehicle || currentRide?.driver?.vehicle;
  const profilePic = driver?.profilePic || driver?.profile_pic;
  const totalTrips = driver?.totalTrips ?? driver?.total_trips ?? 0;
  const displayOffer =
    rideData?.activeTrip?.offer ?? currentRide?.offer ?? rideData?.offer ?? 0;
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

    // Animate the button opacity and slight slide
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
        setIsExpanded(false); // Reset expansion on success
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
        setShowDropModal(false); // Close modal on success
        onCancel();
        if (isMounted.current) setIsExpanded(false);
      } else {
        Alert.alert("Request Failed", "The server could not end the trip.");
      }
    } catch (error) {
      console.error("❌ Drop me here failed:", error);
      Alert.alert("Connection Error", "Unable to reach the server.");
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, currentRide, rideData]);

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
                size={24}
                color="#475569"
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.driverRow}>
          <View style={styles.driverInfo}>
            <IRAvatar
              source={profilePic ? { uri: profilePic } : undefined}
              size={52}
            />
            <View>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFC107" />
                <Text style={styles.ratingText}>
                  {typeof driver.rating === "number"
                    ? driver.rating.toFixed(2)
                    : "5.00"}
                </Text>
                <Text style={styles.tripCount}> • {totalTrips} rides</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleInfo}>
            <IRAvatar
              source={vehicle?.pic ? { uri: vehicle.pic } : undefined}
              variant="rounded"
              size={50}
              style={{ backgroundColor: "#f8fafc" }}
            />
            <View>
              <Text style={styles.carModel}>
                {vehicle?.color} {vehicle?.model}
              </Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateNumber}>
                  {vehicle?.licensePlate || "No Plate"}
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
          <View style={{ gap: 10, paddingBottom: 20 }}>
            <IRButton
              title="Safety Toolkit"
              variant="outline"
              onPress={() => {}}
              leftIcon={
                <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
              }
              style={styles.safetyButton}
              textStyle={styles.safetyButtonText}
              borderColor="#E2E8F0"
            />

            {/* Premium Fade & Slide Animation */}
            {isExpanded && (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0], // Slides up 10px while fading in
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
                  style={{
                    backgroundColor: "#fef2f2",
                    height: 56,
                    borderRadius: 16,
                  }}
                  textStyle={{ color: "#ef4444", fontWeight: "700" }}
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
              <Ionicons name="alert-circle" size={36} color="#ef4444" />
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
        confirmVariant="danger" // Using danger variant for visual emphasis
        loading={isCancelling}
        onConfirm={handleDropMeHere}
        onClose={() => setShowDropModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topSection: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 10,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  driverName: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  ratingBadge: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
    color: "#1e293b",
  },
  tripCount: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  safetyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    //marginBottom: 20,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
  },
  safetyButtonText: { fontSize: 16, fontWeight: "700", color: "#475569" },
  carModel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 2,
  },
  plateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignSelf: "flex-start",
  },
  plateNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  pricePill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: { fontSize: 18, fontWeight: "800", color: "#10B981" },
  footer: { marginTop: "auto" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 15, color: "#64748b", marginBottom: 20 },
  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  reasonChipActive: { backgroundColor: "#ecfdf5", borderColor: "#10B981" },
  reasonChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  reasonChipTextActive: { color: "#10B981" },
  reasonInput: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#1e293b",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  modalActions: { width: "100%", gap: 12 },
  remoteModalPadding: {
    alignItems: "center",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  alertCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  reasonDisplayBox: {
    width: "100%",
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  reasonValue: {
    fontSize: 16,
    color: "#334155",
    fontWeight: "600",
    fontStyle: "italic",
  },
  ongoingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ongoingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
  },
  expandToggle: { padding: 4 },
});

export default TripTab;
