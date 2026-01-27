import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from "react-native";
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
  borderColor?: string; // ✅ Added to match custom outlines
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

  // Content Color Logic
  const getDefaultContentColor = () => {
    if (variant === "outline") return theme.colors.primary;
    if (variant === "ghost") return "#FF3B30"; // Matches the Red text in your CancelButton
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
        <ActivityIndicator 
          color={loadingColor || contentColor} 
          size="small" 
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              styles.text,
              { color: contentColor },
              textStyle,
              { 
                marginLeft: leftIcon ? 8 : 0, 
                marginRight: rightIcon ? 8 : 0 
              }
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
    // ⬛ SHAPE UPDATE: Matches the 12px radius of the CancelButton
    borderRadius: 12, 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  medium: {
    // 📏 HEIGHT UPDATE: 14px padding matches the height of the CancelButton perfectly
    paddingVertical: 14, 
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: theme.colors.error,
  },
  ghost: {
    // 👻 MATCHING: Uses the exact light grey background from the CancelButton
    backgroundColor: '#F2F2F2', 
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3, // Makes the text look tighter and more modern
  },
});