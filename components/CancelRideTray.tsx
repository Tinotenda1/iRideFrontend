// app/passenger/components/trays/CancelRideTray.tsx
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";
import React, { useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { IRButton } from "./IRButton";

interface CancelRideTrayProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  type?: "passenger" | "driver";
}

const PASSENGER_REASONS = [
  "Wait time too long",
  "Driver is not moving",
  "Driver asked me to cancel",
  "Incorrect pickup address",
  "No longer need the ride",
  "Emergency / Drop me here",
];

const DRIVER_REASONS = [
  "Passenger didn't show up",
  "Too much luggage",
  "Safety concerns",
  "Vehicle trouble",
  "Passenger requested cancel",
];

export const CancelRideTray: React.FC<CancelRideTrayProps> = ({
  visible,
  onClose,
  onConfirm,
  loading,
  type = "passenger",
}) => {
  const [reason, setReason] = useState("");
  const reasons = type === "driver" ? DRIVER_REASONS : PASSENGER_REASONS;

  const handleConfirm = () => {
    onConfirm(reason || "No reason provided.");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.trayContainer}
            >
              <SafeAreaView style={styles.safeArea}>
                <View style={styles.content}>
                  <View style={styles.indicator} />

                  <Text style={styles.title}>Cancel ride?</Text>
                  <Text style={styles.subtitle}>
                    Please let us know why you are cancelling
                  </Text>

                  <View
                    style={[
                      styles.reasonContainer,
                      loading && { opacity: 0.5 },
                    ]}
                  >
                    {reasons.map((item) => (
                      <TouchableOpacity
                        key={item}
                        disabled={loading}
                        style={[
                          styles.reasonChip,
                          reason === item && styles.reasonChipActive,
                        ]}
                        onPress={() => setReason(item)}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            reason === item && styles.reasonChipTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.reasonInput, loading && { opacity: 0.5 }]}
                    placeholder="Other reason..."
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    editable={!loading}
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={styles.actions}>
                    <IRButton
                      title="Keep ride"
                      variant="primary"
                      onPress={onClose}
                      disabled={loading}
                    />
                    <IRButton
                      title="Confirm Cancellation"
                      variant="ghost"
                      onPress={handleConfirm}
                      loading={loading} // IRButton handles the spinner internally
                      textStyle={{ color: theme.colors.red }}
                    />
                  </View>
                </View>
              </SafeAreaView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  trayContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: ms(24),
    borderTopRightRadius: ms(24),
  },
  safeArea: {
    width: "100%",
  },
  content: {
    paddingHorizontal: s(24),
    paddingTop: vs(12),
    paddingBottom: Platform.OS === "android" ? vs(30) : vs(10),
  },
  indicator: {
    width: s(40),
    height: vs(4),
    backgroundColor: "#e2e8f0",
    borderRadius: ms(2),
    alignSelf: "center",
    marginBottom: vs(20),
  },
  loadingIndicator: {
    height: vs(4),
    marginBottom: vs(20),
    alignSelf: "center",
  },
  title: {
    fontSize: ms(22),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(4),
  },
  subtitle: {
    fontSize: ms(15),
    color: "#64748b",
    marginBottom: vs(20),
  },
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
    borderColor: theme.colors.primary,
  },
  reasonChipText: {
    fontSize: ms(13),
    fontWeight: "600",
    color: "#475569",
  },
  reasonChipTextActive: {
    color: theme.colors.primary,
  },
  reasonInput: {
    width: "100%",
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: ms(16),
    padding: s(16),
    fontSize: ms(15),
    color: "#1e293b",
    minHeight: vs(80),
    textAlignVertical: "top",
    marginBottom: vs(24),
  },
  actions: {
    gap: vs(12),
  },
});
