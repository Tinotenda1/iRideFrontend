import { ms, vs } from "@/utils/responsive"; // Added responsiveness utility
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { createStyles } from "../utils/styles"; // Assuming path based on previous components

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
        <ActivityIndicator color="#FF3B30" size={ms(20)} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = createStyles({
  button: {
    width: "100%",
    padding: vs(14),
    borderRadius: ms(50),
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    //marginBottom: vs(20),
  },
  text: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: ms(16),
  },
});

export default CancelButton;
