// components/TripStatusModal.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
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
      statusBarTranslucent={true}
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
              size={ms(42)} // Responsive icon size
              color={current.color}
            />
          </View>

          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalReason}>{message}</Text>

          <IRButton
            title={current.btnText}
            onPress={onClose}
            style={{
              backgroundColor: current.btnBg,
              borderRadius: ms(16), // Responsive button corners
            }}
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
    paddingTop: vs(20),
    paddingHorizontal: s(20),
  },
  boltModal: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: ms(32),
    padding: ms(24),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.1,
    shadowRadius: ms(20),
    elevation: 5,
  },
  iconCircle: {
    width: ms(88),
    height: ms(88),
    borderRadius: ms(44),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(20),
  },
  modalTitle: {
    fontSize: ms(24),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(10),
    textAlign: "center",
  },
  modalReason: {
    fontSize: ms(16),
    color: "#64748b",
    textAlign: "center",
    marginBottom: vs(32),
    lineHeight: vs(24),
  },
  modalButtonText: {
    color: "#fff",
    fontSize: ms(18),
    fontWeight: "700",
  },
});

export default TripStatusModal;
