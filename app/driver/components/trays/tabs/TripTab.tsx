// app/driver/components/trays/tabs/TripTab.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ActionConfirmationModal } from "../../../../../components/ActionConfirmationModal";
import { IRAvatar } from "../../../../../components/IRAvatar";
import { IRButton } from "../../../../../components/IRButton";
import { useRideBooking } from "../../../../context/RideBookingContext";

interface DriverTripTabProps {
  onCancel: (reason: string) => Promise<boolean>; // Updated interface
  onArrived: () => void;
  onStartTrip: () => void;
  onEndTrip: () => void;
  isExpanded?: boolean;
  onToggleExpand?: (val: boolean) => void;
}

const PREDEFINED_REASONS = [
  "Passenger didn't show up",
  "Too much luggage",
  "Safety concerns",
  "Vehicle trouble",
  "Passenger requested cancel",
];

const DriverTripTab: React.FC<DriverTripTabProps> = ({
  onCancel,
  onArrived,
  onStartTrip,
  onEndTrip,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { rideData } = useRideBooking();

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Single state for action modals
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: "arrived" | "end" | null;
  }>({ visible: false, type: null });

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [isArriving, setIsArriving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const isMounted = useRef(true);

  const passenger = rideData.activeTrip?.passenger;
  const rideInfo = rideData.activeTrip?.ride;
  const offer = rideData.activeTrip?.offer;
  const status = rideData.status;

  useEffect(() => {
    if (status === "arrived") {
      setIsArriving(false);
    }
    if (status === "on_trip") {
      setIsArriving(false);
      setIsStarting(false);
      setConfirmModal({ visible: false, type: null });
    }
    if (status === "completed" || status === "idle") {
      setIsEnding(false);
      setIsArriving(false);
      setIsStarting(false);
    }
  }, [status]);

  const handleCallPassenger = () => {
    if (passenger?.phone) {
      Linking.openURL(`tel:${passenger.phone}`);
    }
  };

  const handleConfirmArrived = () => {
    setIsArriving(true);
    onArrived();
    setConfirmModal({ visible: false, type: null });
  };

  const handleStartTripPress = () => {
    setIsStarting(true);
    onStartTrip();
  };

  const handleConfirmEndTrip = () => {
    setIsEnding(true);
    onEndTrip();
    setConfirmModal({ visible: false, type: null });
  };

  const handleConfirmCancel = useCallback(async () => {
    if (!isMounted.current || isCancelling) return;

    setIsCancelling(true);
    setIsActionLoading(true);

    try {
      // Call the parent handler moved to DriverTray
      const success = await onCancel(cancelReason);

      if (success && isMounted.current) {
        setShowCancelModal(false);
        setCancelReason("");
      }
    } catch (error) {
      console.error("❌ UI Cancel error:", error);
    } finally {
      if (isMounted.current) {
        setIsCancelling(false);
        setIsActionLoading(false);
      }
    }
  }, [isCancelling, onCancel, cancelReason]);

  if (!passenger) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.passengerRow}>
          <View style={styles.personInfo}>
            <IRAvatar
              source={
                passenger.profilePic ? { uri: passenger.profilePic } : undefined
              }
              name={passenger.name}
              size={56}
            />
            <View>
              <Text style={styles.label}>PASSENGER</Text>
              <Text style={styles.passengerName}>{passenger.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.ratingText}>
                  {passenger.rating || "5.0"}
                </Text>
                <Text style={styles.tripCount}>
                  • {passenger.totalRides || 0} trips
                </Text>
              </View>
            </View>
          </View>

          {status === "on_trip" ? (
            <TouchableOpacity
              style={styles.smartToggle}
              onPress={() => onToggleExpand?.(!isExpanded)}
            >
              <View style={styles.onTripBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.onTripText}>ON TRIP</Text>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-up"}
                size={24}
                color="#64748b"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallPassenger}
            >
              <Ionicons name="call" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>PICKUP</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {rideInfo?.pickupAddress}
              </Text>
            </View>
          </View>
          <View style={styles.verticalLine} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>DESTINATION</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {rideInfo?.destinationAddress}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.earningsRow}>
          <View>
            <Text style={styles.addressLabel}>YOUR EARNINGS</Text>
            <Text style={styles.earningsText}>
              ${parseFloat(offer).toFixed(2)}
            </Text>
          </View>
          <View style={styles.paymentBadge}>
            <Ionicons name="cash-outline" size={16} color="#475569" />
            <Text style={styles.paymentText}>CASH</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {status === "arrived" ? (
          <IRButton
            title="START TRIP"
            style={{ backgroundColor: "#10B981" }}
            onPress={handleStartTripPress}
            loading={isStarting}
            disabled={isActionLoading}
          />
        ) : status === "on_trip" ? (
          isExpanded && (
            <IRButton
              title="END TRIP"
              variant="danger"
              onPress={() => setConfirmModal({ visible: true, type: "end" })}
              loading={isEnding}
              disabled={isStarting}
            />
          )
        ) : (
          <IRButton
            title="I HAVE ARRIVED"
            onPress={() => setConfirmModal({ visible: true, type: "arrived" })}
            loading={isArriving}
          />
        )}

        {status !== "on_trip" && (
          <IRButton
            title="Cancel Trip"
            variant="ghost"
            disabled={isArriving || status === "arrived" || isCancelling}
            style={
              isArriving || status === "arrived" ? { opacity: 0.5 } : undefined
            }
            onPress={() => setShowCancelModal(true)}
          />
        )}
      </View>

      {/* CANCEL MODAL */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Cancel trip?</Text>
            <Text style={styles.modalSubtitle}>Please select a reason</Text>
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
                title="Keep Trip"
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={isActionLoading}
              />
              <IRButton
                title="Confirm Cancellation"
                variant="ghost"
                onPress={handleConfirmCancel}
                loading={isActionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* REUSABLE ACTION MODAL (Arrived & End) */}
      <ActionConfirmationModal
        visible={confirmModal.visible}
        title={
          confirmModal.type === "arrived" ? "Confirm Arrival?" : "End trip?"
        }
        subtitle={
          confirmModal.type === "arrived"
            ? "At the pickup location?"
            : "Reached destination?"
        }
        confirmText={
          confirmModal.type === "arrived"
            ? "Yes, I've Arrived"
            : "Complete Trip"
        }
        confirmColor={confirmModal.type === "arrived" ? "#007AFF" : "#10B981"}
        loading={confirmModal.type === "arrived" ? isArriving : isEnding}
        onConfirm={
          confirmModal.type === "arrived"
            ? handleConfirmArrived
            : handleConfirmEndTrip
        }
        onClose={() => setConfirmModal({ visible: false, type: null })}
      />
    </View>
  );
};

// ... styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  topSection: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  personInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
  },
  passengerName: { fontSize: 20, fontWeight: "700", color: "#1e293b" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 4,
    color: "#1e293b",
  },
  tripCount: { fontSize: 13, color: "#94a3b8" },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  smartToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  onTripBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  onTripText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
    textTransform: "uppercase",
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },
  addressSection: { paddingVertical: 2 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  verticalLine: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginLeft: 3.5,
    marginVertical: 2,
  },
  addressTextContainer: { flex: 1 },
  addressLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 2,
  },
  addressText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsText: { fontSize: 24, fontWeight: "800", color: "#10B981" },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paymentText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  footer: { paddingBottom: 10, gap: 5 },
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
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  modalActions: { width: "100%", gap: 12 },
});

export default DriverTripTab;
