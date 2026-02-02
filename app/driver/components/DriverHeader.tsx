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

import { IRButton } from "../../../components/IRButton";
import { theme } from "../../../constants/theme";
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
}

export default function DriverHeader({
  onMenuPress,
  onOpenSettings,
  setOnline,
  setIsConnecting,
}: DriverHeaderProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [status, setStatus] = useState<DriverSocketStatus>("offline");
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    statusPollRef.current = setInterval(() => {
      setStatus(getDriverSocketStatus());
    }, 500);

    return () => {
      statusPollRef.current && clearInterval(statusPollRef.current);
    };
  }, []);

  const online = status === "connected";
  const isConnecting = status === "connecting" || status === "reconnecting";

  const lastStatus = useRef(online);

  useEffect(() => {
    if (lastStatus.current !== online) {
      setOnline?.(online);
      lastStatus.current = online;
      // ✅ Automatically stop toggle loading when status matches expected state
      setIsToggling(false);
    }
    setIsConnecting?.(isConnecting);
  }, [online, isConnecting]);

  const handleTogglePress = () => {
    if (isToggling || isConnecting) return;

    if (online) {
      setShowOfflineModal(true);
    } else {
      executeToggle(true);
    }
  };

  const executeToggle = async (shouldGoOnline: boolean) => {
    setIsToggling(true);
    setShowOfflineModal(false);
    try {
      if (shouldGoOnline) {
        await connectDriver();
      } else {
        disconnectDriver();
        // Since disconnect is usually instant/local, we reset here
        setIsToggling(false);
      }
    } catch (err) {
      console.error("[DriverHeader] Toggle failed:", err);
      setIsToggling(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.sideButton}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={28} color="#1e293b" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleTogglePress}
          disabled={isToggling || isConnecting}
          style={[
            styles.statusPill,
            online ? styles.pillOnline : styles.pillOffline,
            (isToggling || isConnecting) && { opacity: 0.8 },
          ]}
        >
          {isToggling || isConnecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={styles.statusDot} />
          )}
          <Text style={styles.statusLabel}>
            {isToggling || isConnecting
              ? "WAITING..."
              : online
                ? "GO OFFLINE"
                : "GO ONLINE"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenSettings}
          style={styles.sideButton}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <Modal visible={showOfflineModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningCircle}>
              <Ionicons name="power-outline" size={32} color="#ef4444" />
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
                loading={isToggling} // ✅ Added loading state here
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  header: {
    height: 70,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    minWidth: 150,
    justifyContent: "center",
    gap: 10,
  },
  pillOnline: { backgroundColor: theme.colors.primary },
  pillOffline: { backgroundColor: theme.colors.error },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  statusLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
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
    alignItems: "center",
  },
  warningCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  modalActions: { width: "100%", gap: 12 },
});
