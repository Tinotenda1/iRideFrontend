import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { IRButton } from "./IRButton";

interface ActionConfirmationModalProps {
  visible: boolean;
  title: string;
  subtitle: string;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
  confirmColor?: string;
  confirmVariant?: "primary" | "secondary" | "danger" | "ghost";
}

export const ActionConfirmationModal: React.FC<
  ActionConfirmationModalProps
> = ({
  visible,
  title,
  subtitle,
  confirmText,
  onConfirm,
  onClose,
  loading,
  confirmColor,
  confirmVariant = "primary",
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIndicator} />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          <View style={styles.modalActions}>
            <IRButton
              title={confirmText}
              variant={confirmVariant}
              style={
                confirmColor ? { backgroundColor: confirmColor } : undefined
              }
              onPress={onConfirm}
              loading={loading}
            />
            <IRButton
              title="Go Back"
              variant="ghost"
              onPress={onClose}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  modalActions: {
    width: "100%",
    gap: 12,
  },
});
