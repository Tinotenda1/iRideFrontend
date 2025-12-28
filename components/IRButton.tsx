// components/IRButton.tsx
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { theme } from "../constants/theme";

interface IRButtonProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  style?: any;
  textStyle?: any; // ✅ New prop to customize the button text
  loadingColor?: string; // custom loader color
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
  textStyle, // ✅ Destructure new prop
}: IRButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case "secondary":
        return styles.secondary;
      case "outline":
        return styles.outline;
      case "danger":
        return styles.danger;
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

  const defaultTextStyle =
    variant === "outline" ? styles.outlineText :
    variant === "danger" ? styles.dangerText :
    styles.text;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getButtonStyle(),
        getSizeStyle(),
        fullWidth && { width: "100%" },
        disabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === "outline" ? theme.colors.primary : "#fff"} 
          size="small" 
        />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              defaultTextStyle,
              textStyle, // ✅ Apply custom text style here
              { marginLeft: leftIcon ? 8 : 0, marginRight: rightIcon ? 8 : 0 }
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
    borderRadius: theme.borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 20,
    paddingHorizontal: 32,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: theme.colors.error,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  dangerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
