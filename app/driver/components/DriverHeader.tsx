// app/driver/components/DriverHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ms, s, vs } from "@/utils/responsive";
import { IRButton } from "../../../components/IRButton";
import { theme } from "../../../constants/theme";
import { useRideBooking } from "../../context/RideBookingContext"; // Added this import
import {
  connectDriver,
  disconnectDriver,
  DriverSocketStatus,
  getDriverSocketStatus,
} from "../socketConnectionUtility/driverSocketService";

interface DriverHeaderProps {
  onMenuPress: () => void;
  onOpenSettings: () => void;
  setOnline?: (value: boolean) => void;
  setIsConnecting?: (value: boolean) => void;
  setManualOffline?: (value: boolean) => void;
}

export default function DriverHeader({
  onMenuPress,
  onOpenSettings,
  setOnline,
  setIsConnecting,
  setManualOffline,
}: DriverHeaderProps) {
  const { rideData } = useRideBooking(); // Access the current ride state
  const [isToggling, setIsToggling] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [status, setStatus] = useState<DriverSocketStatus>("offline");
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [manualOffline, setManualOfflineState] = useState(true);
  const userInitiatedRef = useRef(false);

  // --- NEW: AUTOMATIC ONLINE TRIGGER FOR CRITICAL STATES ---
  useEffect(() => {
    const criticalStatuses = ["matched", "arrived", "on_trip", "on_rating"];
    const isOffline = status === "offline";

    // Use optional chaining and nullish coalescing to safely check status
    const currentStatus = rideData?.status || "idle";

    // If we are in a ride but the socket is offline, force a connection
    if (criticalStatuses.includes(currentStatus) && isOffline && !isToggling) {
      console.log(
        `[DriverHeader] Critical state (${currentStatus}) detected. Auto-connecting...`,
      );
      executeToggle(true);
    }
  }, [rideData.status, status]);

  // Poll socket status
  useEffect(() => {
    statusPollRef.current = setInterval(() => {
      setStatus(getDriverSocketStatus());
    }, 300);

    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  const socketConnected = status === "connected";
  const isConnecting = status === "connecting" || status === "reconnecting";
  const isConnectingOrToggling = isToggling || isConnecting;

  const lastStatus = useRef(socketConnected);

  // Sync state only for user-initiated actions (or auto-toggles)
  useEffect(() => {
    if (lastStatus.current !== socketConnected) {
      // Note: userInitiatedRef.current will be true if triggered by the auto-effect above
      if (userInitiatedRef.current) {
        setOnline?.(socketConnected);

        if (socketConnected) {
          setManualOffline?.(false);
          setManualOfflineState(false);
        }
        userInitiatedRef.current = false;
      }
      lastStatus.current = socketConnected;
      setIsToggling(false);
    }
    setIsConnecting?.(isConnecting);
  }, [socketConnected, isConnecting]);

  const handleTogglePress = () => {
    if (isConnectingOrToggling) return;

    if (!manualOffline) {
      setShowOfflineModal(true);
    } else {
      executeToggle(true);
    }
  };

  const executeToggle = async (shouldGoOnline: boolean) => {
    userInitiatedRef.current = true;
    setIsToggling(true);
    setShowOfflineModal(false);

    try {
      if (shouldGoOnline) {
        await connectDriver();
      } else {
        disconnectDriver();
        setManualOfflineState(true);
        setManualOffline?.(true);
        setOnline?.(false);
      }
    } catch (err) {
      console.error("[DriverHeader] Toggle failed:", err);
    } finally {
      setIsToggling(false);
    }
  };

  // --- UI LOGIC ---
  let buttonText = "GO ONLINE";
  if (isConnectingOrToggling) {
    buttonText = "WAITING...";
  } else if (!manualOffline) {
    buttonText = "GO OFFLINE";
  }

  const buttonStyle = [
    styles.statusPill,
    !manualOffline && socketConnected ? styles.pillOnline : styles.pillOffline,
    isConnectingOrToggling && { opacity: 0.8 },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.sideButton}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={ms(28)} color="#1e293b" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleTogglePress}
          disabled={isConnectingOrToggling}
          style={buttonStyle}
        >
          {isConnectingOrToggling ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <View style={styles.statusDot} />
          )}
          <Text style={styles.statusLabel}>{buttonText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenSettings}
          style={styles.sideButton}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={ms(24)} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <Modal visible={showOfflineModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningCircle}>
              <Ionicons
                name="power-outline"
                size={ms(32)}
                color={theme.colors.error}
              />
            </View>

            <Text style={styles.modalTitle}>Go offline?</Text>
            <Text style={styles.modalSubtitle}>
              You will not receive any new ride requests until you go back
              online.
            </Text>

            <View style={styles.modalActions}>
              <IRButton
                title="Stay Online"
                variant="primary"
                onPress={() => setShowOfflineModal(false)}
                disabled={isToggling}
              />
              <IRButton
                title="Yes, Go Offline"
                variant="ghost"
                onPress={() => executeToggle(false)}
                loading={isToggling}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... (styles stay exactly the same)

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: ms(8),
    elevation: 5,
    zIndex: 10,
  },
  header: {
    height: vs(70),
    paddingHorizontal: s(20),
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideButton: {
    width: s(44),
    height: s(44),
    borderRadius: ms(50),
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: ms(50),
    minWidth: s(160),
    justifyContent: "center",
    gap: s(10),
  },
  pillOnline: { backgroundColor: theme.colors.primary },
  pillOffline: { backgroundColor: theme.colors.error },
  statusDot: {
    width: s(10),
    height: s(10),
    borderRadius: ms(5),
    backgroundColor: theme.colors.surface,
  },
  statusLabel: {
    color: theme.colors.surface,
    fontSize: ms(14),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
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
    alignItems: "center",
  },
  warningCircle: {
    width: s(64),
    height: s(64),
    borderRadius: ms(32),
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(16),
  },
  modalTitle: {
    fontSize: ms(22),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(8),
  },
  modalSubtitle: {
    fontSize: ms(15),
    color: "#64748b",
    textAlign: "center",
    lineHeight: vs(22),
    marginBottom: vs(32),
  },
  modalActions: { width: "100%", gap: vs(12) },
});
