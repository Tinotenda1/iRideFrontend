import React from "react";
import { StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { theme } from "../constants/theme";

interface IRInputProps {
  style?: any;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  [key: string]: any;
}

export function IRInput({ 
  style, 
  label, 
  error, 
  leftIcon, 
  rightIcon, 
  ...props 
}: IRInputProps) {
  const containerStyle: ViewStyle[] = [
    styles.container, 
  ];

  // Add error style if there's an error
  if (error) {
    containerStyle.push(styles.containerError);
  }

  // Add padding styles conditionally
  if (leftIcon) {
    containerStyle.push(styles.withLeftIcon);
  }
  if (rightIcon) {
    containerStyle.push(styles.withRightIcon);
  }

  return (
    <View style={styles.wrapper}>
      <View style={containerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, style]}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.md,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
  },
  containerError: {
    borderColor: theme.colors.error,
  },
  withLeftIcon: {
    paddingLeft: 12,
  },
  withRightIcon: {
    paddingRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
});