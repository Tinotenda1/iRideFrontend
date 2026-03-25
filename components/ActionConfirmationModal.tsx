import { ms, s, vs } from "@/utils/responsive";
import React from "react";
import {
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
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
      animationType="fade" // Changed to fade
      statusBarTranslucent // Full screen behind status bar
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <SafeAreaView style={styles.safeArea}>
                <View style={styles.contentContainer}>
                  <View style={styles.modalIndicator} />
                  <Text style={styles.modalTitle}>{title}</Text>
                  <Text style={styles.modalSubtitle}>{subtitle}</Text>

                  <View style={styles.modalActions}>
                    <IRButton
                      title={confirmText}
                      variant={confirmVariant}
                      style={
                        confirmColor
                          ? { backgroundColor: confirmColor }
                          : undefined
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
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    width: "100%",
  },
  safeArea: {
    width: "100%",
  },
  contentContainer: {
    paddingHorizontal: s(24),
    paddingTop: vs(12),
    paddingBottom: Platform.OS === "android" ? vs(30) : vs(10), // Handling control bar padding
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
  modalSubtitle: {
    fontSize: ms(15),
    color: "#64748b",
    marginBottom: vs(20),
  },
  modalActions: {
    width: "100%",
    gap: vs(12),
  },
});
