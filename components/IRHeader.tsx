import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { theme } from "../constants/theme";

interface IRHeaderProps {
  title: string;
  subtitle?: string;
}

export function IRHeader({ title, subtitle }: IRHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create<{
  container: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
}>({
  container: {
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as TextStyle["fontWeight"],
    lineHeight: theme.typography.h1.lineHeight,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight as TextStyle["fontWeight"],
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
