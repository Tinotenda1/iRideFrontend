import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ms, s, vs } from "@/utils/responsive";
import { ActionConfirmationModal } from "../../../../../components/ActionConfirmationModal";
import { CancelRideTray } from "../../../../../components/CancelRideTray"; // Adjust path as necessary
import { IRAvatar } from "../../../../../components/IRAvatar";
import { IRButton } from "../../../../../components/IRButton";
import { theme } from "../../../../../constants/theme";
import { getApiBaseUrl } from "../../../../../utils/api";
import { useRideBooking } from "../../../../context/RideBookingContext";

interface DriverTripTabProps {
  onCancel: (reason: string) => Promise<boolean>;
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
  // Image Modal State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
  const driver = rideData.activeTrip?.driver;
  const rideInfo = rideData.activeTrip?.ride;
  const offer = rideData.activeTrip?.offer;
  const status = rideData.status;

  const resolveImagePath = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (
      path.startsWith("http") ||
      path.startsWith("file://") ||
      path.startsWith("content://")
    ) {
      return { uri: path };
    }
    try {
      const baseUrl = getApiBaseUrl().replace(/\/$/, "");
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return { uri: `${baseUrl}${cleanPath}` };
    } catch (e) {
      return { uri: path };
    }
  };

  useEffect(() => {
    if (status === "arrived") setIsArriving(false);
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

  const handleConfirmCancel = useCallback(
    async (reason: string) => {
      if (!isMounted.current || isCancelling) return;
      setIsCancelling(true);
      setIsActionLoading(true);

      try {
        const success = await onCancel(reason);
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
    },
    [isCancelling, onCancel],
  );

  const handleCallPassenger = () => {
    if (!passenger?.phone) {
      Alert.alert("Error", "Passenger phone number is not available.");
      return;
    }
    const phoneNumber = "+" + passenger.phone.replace(/\D/g, "");
    const url =
      Platform.OS === "android"
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`;
    Linking.openURL(url).catch((err) => console.error("Dialer error:", err));
  };

  const handleWhatsAppPassenger = () => {
    if (!passenger?.phone) {
      Alert.alert("Error", "Passenger phone number is not available.");
      return;
    }
    const phoneNumber = "+" + passenger.phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Drift Driver - ${driver?.name}: `);
    const url = `https://wa.me/${phoneNumber}?text=${message}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else
          Alert.alert(
            "WhatsApp not installed",
            "Please install WhatsApp to send a message.",
          );
      })
      .catch((err) => console.error("WhatsApp error:", err));
  };

  if (!passenger) {
    return (
      <View
        style={[styles.container, styles.center, { paddingVertical: vs(40) }]}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.passengerRow}>
          <View style={styles.personInfo}>
            <TouchableOpacity
              onPress={() => {
                const img = resolveImagePath(passenger.profilePic);
                if (img) setPreviewImage(img.uri);
              }}
            >
              <IRAvatar
                source={resolveImagePath(passenger.profilePic)}
                name={passenger.name}
                size={ms(56)}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.label}>PASSENGER</Text>
              <Text style={styles.passengerName}>{passenger.name}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons
                    key={i}
                    name={
                      i <= Math.round(parseFloat(passenger.rating || "5"))
                        ? "star"
                        : "star-outline"
                    }
                    size={ms(14)}
                    color="#FFC107"
                    style={{ marginRight: s(1) }}
                  />
                ))}
                <Text style={styles.ratingText}>
                  {passenger.rating || "5.0"}
                </Text>
                <Text style={styles.tripCount}>
                  {"  "}• {passenger.totalRides || 0} trips
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
                size={ms(24)}
                color="#64748b"
              />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: s(12) }}>
              <TouchableOpacity
                style={[
                  styles.callButton,
                  { backgroundColor: theme.colors.secondary },
                ]}
                onPress={handleCallPassenger}
              >
                <Ionicons name="call" size={ms(22)} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.callButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleWhatsAppPassenger}
              >
                <Ionicons name="logo-whatsapp" size={ms(22)} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <View
              style={[styles.dot, { backgroundColor: theme.colors.primary }]}
            />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressText} numberOfLines={1}>
                {rideInfo?.pickupAddress}
              </Text>
            </View>
          </View>
          <View style={styles.verticalLine} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.red }]} />
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressText} numberOfLines={1}>
                {rideInfo?.destinationAddress}
              </Text>
            </View>
          </View>
        </View>

        {isExpanded && (
          <>
            <View style={styles.divider} />
            <View style={styles.earningsRow}>
              <View>
                <Text style={styles.addressLabel}>YOUR EARNINGS</Text>
                <Text style={styles.earningsText}>
                  ${parseFloat(offer).toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentBadge}>
                <Ionicons
                  name={
                    rideInfo?.paymentMethod?.toLowerCase() === "ecocash"
                      ? "wallet-outline"
                      : "cash-outline"
                  }
                  size={ms(16)}
                  color="#475569"
                />
                <Text style={styles.paymentText}>
                  {rideInfo?.paymentMethod?.toUpperCase() || "CASH"}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.divider} />
        {status === "arrived" ? (
          <IRButton
            title="START TRIP"
            style={{ backgroundColor: theme.colors.primary }}
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
            disabled={isArriving || isCancelling}
            style={
              isArriving || status === "arrived" ? { opacity: 0.5 } : undefined
            }
            onPress={() => setShowCancelModal(true)}
          />
        )}
      </View>

      {/* --- MODALS --- */}

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity
            style={styles.closeImage}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={ms(30)} color="#fff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Cancel Modal */}
      <CancelRideTray
        visible={showCancelModal}
        loading={isCancelling}
        type="driver"
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />

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
        confirmColor={
          confirmModal.type === "arrived"
            ? theme.colors.secondary
            : theme.colors.primary
        }
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

const styles = StyleSheet.create({
  // ... your existing styles ...
  container: {
    // Removed flex: 1
    backgroundColor: theme.colors.surface,
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    paddingBottom: vs(32),
  },
  topSection: {
    // Removed flex: 1
  },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: vs(12),
    color: "#94a3b8",
    fontSize: ms(14),
    fontWeight: "500",
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(15),
  },
  personInfo: { flexDirection: "row", alignItems: "center", gap: s(12) },
  label: {
    fontSize: ms(10),
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
  },
  passengerName: { fontSize: ms(20), fontWeight: "700", color: "#1e293b" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: vs(2) },
  ratingText: {
    fontSize: ms(14),
    fontWeight: "700",
    marginLeft: s(4),
    color: "#1e293b",
  },
  tripCount: { fontSize: ms(13), color: "#94a3b8" },
  callButton: {
    width: s(48),
    height: s(48),
    borderRadius: ms(100),
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  smartToggle: { flexDirection: "row", alignItems: "center", gap: s(8) },
  onTripBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: ms(20),
    gap: s(6),
  },
  pulseDot: {
    width: s(8),
    height: s(8),
    borderRadius: ms(20),
    backgroundColor: theme.colors.primary,
  },
  onTripText: {
    fontSize: ms(12),
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginVertical: vs(5),
  },
  addressSection: { paddingVertical: vs(2) },
  addressRow: { flexDirection: "row", alignItems: "center", gap: s(12) },
  dot: { width: s(8), height: s(8), borderRadius: ms(10) },
  verticalLine: {
    width: 1,
    height: vs(20),
    backgroundColor: theme.colors.background,
    marginLeft: s(3.5),
    marginVertical: vs(2),
  },
  addressTextContainer: { flex: 1 },
  addressLabel: {
    fontSize: ms(10),
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: vs(2),
  },
  addressText: { fontSize: ms(14), color: "#475569", fontWeight: "500" },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsText: {
    fontSize: ms(24),
    fontWeight: "800",
    color: theme.colors.primary,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(5),
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: ms(8),
  },
  paymentText: { fontSize: ms(12), fontWeight: "700", color: "#475569" },
  footer: { paddingBottom: vs(10), gap: vs(5) },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    padding: s(24),
    paddingBottom: vs(40),
  },
  modalIndicator: {
    width: s(40),
    height: vs(4),
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  reasonChipActive: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary,
  },
  reasonChipText: { fontSize: ms(13), fontWeight: "600", color: "#475569" },
  reasonChipTextActive: { color: theme.colors.primary },
  reasonInput: {
    width: "100%",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: ms(16),
    padding: s(16),
    minHeight: vs(80),
    textAlignVertical: "top",
    marginBottom: vs(24),
  },
  modalActions: { width: "100%", gap: vs(12) },

  // New Image Modal Styles
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  closeImage: {
    position: "absolute",
    top: vs(40),
    right: s(20),
    zIndex: 10,
    padding: 10,
  },
});

export default DriverTripTab;
