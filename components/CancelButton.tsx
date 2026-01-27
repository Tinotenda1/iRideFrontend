import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface CancelButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  onPress,
  isLoading = false,
  label = "Cancel Request",
  style,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color="#FF3B30" />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    marginBottom: 20,
  },
  text: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default CancelButton;
