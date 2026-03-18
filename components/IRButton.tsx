// components/IRButton.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { theme } from "../constants/theme";

interface IRButtonProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
  borderColor?: string;
}

export function IRButton({
  title,
  variant = "primary",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onPress,
  fullWidth = true,
  size = "md",
  style,
  textStyle,
  loadingColor,
  borderColor,
}: IRButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondary;
      case "outline":
        return [styles.outline, borderColor ? { borderColor } : null];
      case "danger":
        return styles.danger;
      case "ghost":
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "sm":
        return styles.small;
      case "lg":
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getDefaultContentColor = () => {
    if (variant === "outline") return theme.colors.primary;
    if (variant === "ghost") return "#FF3B30";
    if (variant === "danger") return "#fff";
    return "#fff";
  };

  const contentColor = getDefaultContentColor();

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getButtonStyle(),
        getSizeStyle(),
        fullWidth && { width: "100%" },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor || contentColor} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              { color: contentColor },
              textStyle,
              {
                marginLeft: leftIcon ? s(8) : 0,
                marginRight: rightIcon ? s(8) : 0,
              },
            ]}
          >
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: ms(200), // Scaled border radius
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingVertical: vs(10),
    paddingHorizontal: s(16),
  },
  medium: {
    paddingVertical: vs(14),
    paddingHorizontal: s(24),
  },
  large: {
    paddingVertical: vs(18),
    paddingHorizontal: s(32),
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    borderWidth: ms(1.5),
    borderColor: theme.colors.primary,
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: theme.colors.error,
  },
  ghost: {
    backgroundColor: "#F2F2F2",
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: ms(16), // Responsive font size
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
