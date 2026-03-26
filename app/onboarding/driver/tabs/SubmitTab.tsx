import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import legalData from "@/assets/legalContent.json"; // Path to your JSON
import { LegalModal } from "@/components/LegalModal"; // Path to your modal
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive";

interface SubmitTabProps {
  agreed: boolean;
  onToggle: (val: boolean) => void;
}

export const SubmitTab = ({ agreed, onToggle }: SubmitTabProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeLegal, setActiveLegal] = useState({ title: "", content: "" });

  const openLegal = (
    type: "privacyPolicy" | "termsOfService" | "driverCode",
  ) => {
    const titles = {
      privacyPolicy: "Privacy Policy",
      termsOfService: "Terms & Conditions",
      driverCode: "Driver Code of Conduct",
    };

    setActiveLegal({
      title: titles[type],
      content: legalData[type],
    });
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Reusable Legal Modal */}
      <LegalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={activeLegal.title}
        content={activeLegal.content}
      />

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
          <Text style={styles.highlight}>24 to 48 hours</Text>.
        </Text>
      </View>

      <View style={styles.legalBox}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => onToggle(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && (
              <Ionicons name="checkmark" size={ms(16)} color="white" />
            )}
          </View>

          <Text style={styles.legalText}>
            I have read and agree to Drift{"'"}s{" "}
            <Text
              style={styles.link}
              onPress={() => openLegal("termsOfService")}
            >
              Terms & Conditions
            </Text>
            ,{" "}
            <Text
              style={styles.link}
              onPress={() => openLegal("privacyPolicy")}
            >
              Privacy Policy
            </Text>{" "}
            and{" "}
            <Text style={styles.link} onPress={() => openLegal("driverCode")}>
              Driver Code of Conduct
            </Text>
            .
          </Text>
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { paddingVertical: vs(20), alignItems: "center" },
  iconContainer: { marginBottom: vs(30), alignItems: "center" },
  pulseCircle: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  contentSection: { alignItems: "center", marginBottom: vs(30) },
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
  },
  highlight: { color: "#1e293b", fontWeight: "700" },

  legalBox: {
    backgroundColor: "#f8fafc",
    padding: ms(16),
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: "100%",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(12),
  },
  checkbox: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(6),
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginTop: vs(2),
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  legalText: {
    flex: 1,
    fontSize: ms(13),
    color: "#64748b",
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
  footerNote: { fontSize: ms(13), color: "#94a3b8" },
});
