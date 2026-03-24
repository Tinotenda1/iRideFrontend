// app/onboarding/driver/tabs/WelcomeTab.tsx
import { theme } from "@/constants/theme";
import { ms, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { InstructionItem } from "../InstructionItem";

export const WelcomeTab = () => (
  <View style={{ flex: 1 }}>
    <Text
      style={{
        ...(theme.typography.h3 as any),
        color: theme.colors.text,
        marginBottom: vs(20),
      }}
    >
      How to become a Drift Partner
    </Text>

    <InstructionItem
      number={1}
      text="Verify your personal details to secure your Drift profile."
    />
    <InstructionItem
      number={2}
      text="Upload your National ID and permits for authorization."
    />
    <InstructionItem
      number={3}
      text="Provide vehicle specs to ensure a premium Drift experience."
    />
    <InstructionItem
      number={4}
      text="Select your vehicle capabilities to reach more passengers."
    />

    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.background,
        padding: ms(16),
        borderRadius: 15, // Matches your new input field style
        marginTop: vs(24),
        alignItems: "center",
        gap: ms(10),
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <Ionicons
        name="flash" // High-energy icon choice
        size={ms(20)}
        color={theme.colors.primary}
      />
      <Text
        style={{
          ...(theme.typography.caption as any),
          color: theme.colors.textSecondary,
          flex: 1,
          lineHeight: ms(18),
        }}
      >
        Once submitted, our team will review your credentials. You will be ready
        to Drift in 24–48 hours.
      </Text>
    </View>
  </View>
);
