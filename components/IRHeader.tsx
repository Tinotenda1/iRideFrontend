import { ms, vs } from "@/utils/responsive"; // Added responsiveness utility
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
    marginBottom: vs(theme.spacing.xl),
    alignItems: "center",
  },
  title: {
    // ms is used for font sizes to prevent them from becoming too massive on tablets
    fontSize: ms(theme.typography.h1.fontSize),
    fontWeight: theme.typography.h1.fontWeight as TextStyle["fontWeight"],
    lineHeight: vs(theme.typography.h1.lineHeight),
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: vs(theme.spacing.sm),
  },
  subtitle: {
    fontSize: ms(theme.typography.body.fontSize),
    fontWeight: theme.typography.body.fontWeight as TextStyle["fontWeight"],
    lineHeight: vs(theme.typography.body.lineHeight),
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
