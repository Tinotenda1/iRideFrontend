// components/TripStatusModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { IRButton } from "./IRButton";

export type ModalType = "arrival" | "cancellation" | "completion" | "started";

interface TripStatusModalProps {
  visible: boolean;
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
}

const TripStatusModal: React.FC<TripStatusModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
}) => {
  const config = {
    arrival: {
      icon: "map",
      color: "#34C759",
      btnText: "I'm coming",
      btnBg: "#000",
    },
    cancellation: {
      icon: "alert-circle",
      color: "#FF3B30",
      btnText: "Got it",
      btnBg: "#34C759",
    },
    completion: {
      icon: "medal",
      color: "#34C759",
      btnText: "Done",
      btnBg: "#000",
    },
    started: {
      icon: "navigate-circle",
      color: "#007AFF",
      btnText: "Great",
      btnBg: "#000",
    },
  };

  const current = config[type] || config.cancellation;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true} // ✅ This ensures it covers the status bar area
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.boltModal}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: `${current.color}15` },
            ]}
          >
            <Ionicons
              name={current.icon as any}
              size={42}
              color={current.color}
            />
          </View>

          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalReason}>{message}</Text>

          <IRButton
            title={current.btnText}
            onPress={onClose}
            style={{ backgroundColor: current.btnBg, borderRadius: 16 }}
            textStyle={styles.modalButtonText}
            size="sm"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  boltModal: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 10,
    textAlign: "center",
  },
  modalReason: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});

export default TripStatusModal;
