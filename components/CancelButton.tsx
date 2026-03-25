import { ms, vs } from "@/utils/responsive";
import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CancelButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>; // Added to control the outer wrapper
}

const CancelButton: React.FC<CancelButtonProps> = ({
  onPress,
  isLoading = false,
  label = "Cancel Request",
  style,
  containerStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isLoading}
      style={[
        styles.button,
        // Dynamically add padding to account for the bottom hardware/software bar
        { marginBottom: Math.max(insets.bottom, vs(16)) },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#FF3B30" size={ms(20)} />
      ) : (
        <Text style={styles.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: vs(14),
    paddingHorizontal: ms(20),
    borderRadius: ms(50),
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FF3B30",
    fontWeight: "700",
    fontSize: ms(16),
  },
});

export default CancelButton;
