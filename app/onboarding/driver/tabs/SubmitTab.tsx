import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";

export const SubmitTab = () => {
  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Couldn't load page", err),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={styles.pulseCircle}>
          <Ionicons
            name="shield-checkmark"
            size={ms(50)}
            color={theme.colors.primary}
          />
        </View>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.title}>Ready for Review</Text>
        <Text style={styles.description}>
          Our team manually verifies every driver to ensure a safe community.
          This process usually takes{" "}
          <Text style={styles.highlight}>24 to 48 hours</Text>. You{"'"}ll
          receive a notification as soon as you{"'"}re cleared to drive.
        </Text>
      </View>

      <View style={styles.legalBox}>
        <Text style={styles.legalText}>
          {'By clicking "Finish", you agree to Drift\'s '}
          <Text
            style={styles.link}
            onPress={() => openLink("https://drift.app/t&cs")}
          >
            Terms & Conditions
          </Text>{" "}
          and{" "}
          <Text
            style={styles.link}
            onPress={() => openLink("https://drift.app/privacy-policy")}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons
          name="information-circle-outline"
          size={ms(18)}
          color="#64748b"
        />
        <Text style={styles.footerNote}>
          Double-check your vehicle photos before finishing.
        </Text>
      </View>
    </View>
  );
};

// ... Styles remain the same

const styles = StyleSheet.create({
  container: {
    paddingVertical: vs(20),
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: vs(30),
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCircle: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    backgroundColor: `${theme.colors.primary}15`, // Light primary tint
    justifyContent: "center",
    alignItems: "center",
  },
  contentSection: {
    alignItems: "center",
    marginBottom: vs(40),
  },
  title: {
    fontSize: ms(24),
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: vs(12),
  },
  description: {
    fontSize: ms(16),
    color: "#64748b",
    textAlign: "center",
    lineHeight: vs(24),
    paddingHorizontal: s(10),
  },
  highlight: {
    color: "#1e293b",
    fontWeight: "700",
  },
  legalBox: {
    backgroundColor: "#f8fafc",
    padding: ms(16),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%",
  },
  legalText: {
    fontSize: ms(13),
    color: "#64748b",
    textAlign: "center",
    lineHeight: vs(20),
  },
  link: {
    color: theme.colors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: vs(20),
    gap: s(6),
  },
  footerNote: {
    fontSize: ms(13),
    color: "#94a3b8",
  },
});
