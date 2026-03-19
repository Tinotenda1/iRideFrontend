// components/IRAvatar.tsx
import { ms } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";
import { theme } from "../constants/theme";

interface IRAvatarProps {
  source?: { uri: string };
  name?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  variant?: "circle" | "rounded";
  style?: ViewStyle;
}

export function IRAvatar({
  source,
  name,
  size = "md",
  variant = "circle",
  style,
}: IRAvatarProps) {
  const getSize = (): number => {
    // Applied moderate scale to ensure avatars grow/shrink gracefully
    if (typeof size === "number") return ms(size);
    switch (size) {
      case "sm":
        return ms(32);
      case "md":
        return ms(48);
      case "lg":
        return ms(64);
      case "xl":
        return ms(80);
      default:
        return ms(48);
    }
  };

  const avatarSize = getSize();
  // Border radius for 'rounded' now pulls from theme but stays responsive via ms()
  const borderRadius =
    variant === "circle" ? avatarSize / 2 : ms(theme.borderRadius.md);

  return (
    <View
      style={[
        styles.container,
        { width: avatarSize, height: avatarSize, borderRadius },
        style,
      ]}
    >
      {source ? (
        <Image source={source} style={[styles.image, { borderRadius }]} />
      ) : (
        <View style={[styles.placeholder, { borderRadius }]}>
          <Ionicons
            name="person"
            size={avatarSize * 0.6} // Scales proportionally with the responsive container
            color={theme.colors.textSecondary}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
