import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRideBooking } from "../../../../app/context/RideBookingContext";
import CancelButton from "../../../../components/CancelButton";
import { getUserInfo } from "../../../../utils/storage";
import { subscribeToRideCancellation } from "../../socketConnectionUtility/passengerSocketService";

interface TripTabProps {
  onCancel: () => void;
}

// ✅ Bolt-style predefined passenger reasons
const PREDEFINED_REASONS = [
  "Wait time too long",
  "Driver is not moving",
  "Driver asked me to cancel",
  "Incorrect pickup address",
  "No longer need the ride",
];

const TripTab: React.FC<TripTabProps> = ({ onCancel }) => {
  const { currentRide } = useRideBooking();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ✅ New state for when the driver cancels
  const [remoteCancelData, setRemoteCancelData] = useState<{
    reason: string;
    cancelledBy: string;
  } | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // ✅ Listen for cancellation from the driver via the service
    subscribeToRideCancellation((data) => {
      if (data.cancelledBy === "driver" && isMounted.current) {
        setRemoteCancelData(data);
      }
    });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const driver = currentRide?.driver;
  const vehicle = currentRide?.driver?.vehicle as any;

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
          reason: cancelReason || "No reason selected", // ✅ Send reason to backend
        }),
      });

      onCancel();
      if (isMounted.current) setShowCancelModal(false);
    } catch (error) {
      console.error("❌ Cancel failed:", error);
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, cancelReason]);

  // ✅ Handle closing the driver-cancellation modal
  const handleCloseRemoteModal = () => {
    setRemoteCancelData(null);
    onCancel(); // Returns user to input tab
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
      {/* Top Section: Driver & Vehicle Info */}
      <View style={styles.topSection}>
        <View style={styles.driverRow}>
          <View style={styles.driverInfo}>
            <View style={styles.avatarWrapper}>
              {driver.profilePic ? (
                <Image
                  source={{ uri: driver.profilePic }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons name="person" size={24} color="#94a3b8" />
              )}
            </View>
            <View>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingBadge}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name="star"
                    size={12}
                    color="#FFC107"
                    style={{ marginRight: 1 }}
                  />
                ))}
                <Text style={styles.ratingText}>
                  {typeof driver.rating === "number"
                    ? driver.rating.toFixed(2)
                    : "5.00"}
                </Text>
                <Text style={styles.tripCount}>
                  {" "}
                  • {driver.totalTrips || 0} rides
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleInfo}>
            <View style={styles.carIconWrapper}>
              <Image
                source={{
                  uri:
                    vehicle?.pic ||
                    "https://cdn-icons-png.flaticon.com/512/744/744465.png",
                }}
                style={styles.carImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.carModel}>
                {vehicle?.color} {vehicle?.model}
              </Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateNumber}>{vehicle?.licensePlate}</Text>
              </View>
            </View>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              $
              {typeof currentRide?.offer === "number"
                ? currentRide?.offer.toFixed(2)
                : currentRide?.offer || "0.00"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <CancelButton
          label="Cancel ride"
          onPress={() => setShowCancelModal(true)}
        />
      </View>

      {/* ✅ Premium Bolt-style Cancel Modal (User Initiated) */}
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
              placeholderTextColor="#94a3b8"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.keepBtn}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={isCancelling}
              >
                <Text style={styles.keepBtnText}>Keep ride</Text>
              </TouchableOpacity>
              <CancelButton
                label="Confirm Cancellation"
                onPress={handleConfirmCancel}
                isLoading={isCancelling}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Driver-Initiated Cancellation Modal (New) */}
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

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleCloseRemoteModal}
            >
              <Text style={styles.closeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
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
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 15 },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  carIconWrapper: {
    width: 50,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  carImage: { width: "100%", height: "100%" },
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
  footer: { paddingBottom: 20 },

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
  modalSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 20,
  },
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
  reasonChipActive: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10B981",
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  reasonChipTextActive: {
    color: "#10B981",
  },
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
  modalActions: {
    width: "100%",
    gap: 12,
  },
  keepBtn: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  keepBtnText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 16,
  },

  // ✅ New Remote Modal Styles
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
  closeBtn: {
    width: "100%",
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});

export default TripTab;
