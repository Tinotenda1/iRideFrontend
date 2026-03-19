import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { hp, ms, s, vs } from "@/utils/responsive";
import { createStyles } from "@/utils/styles";

/* -------------------------------- Types & Data ---------------------------- */

type OnboardingStep = "welcome" | "documents" | "vehicle" | "training";

interface StepContent {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Record<OnboardingStep, StepContent> = {
  welcome: {
    title: "Welcome to Drift",
    subtitle: "Complete these steps to start earning on your own schedule.",
    icon: "speedometer-outline",
  },
  documents: {
    title: "Legal Documents",
    subtitle: "We need to verify your identity and driving eligibility.",
    icon: "document-text-outline",
  },
  vehicle: {
    title: "Vehicle Details",
    subtitle: "Register the car you'll be using for trips.",
    icon: "car-outline",
  },
  training: {
    title: "Quick Training",
    subtitle: "A 2-minute guide on how to provide a 5-star experience.",
    icon: "school-outline",
  },
};

/* -------------------------------------------------------------------------- */

const DriverOnboarding = () => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");

  const renderInstructions = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Onboarding Instructions</Text>

      <InstructionItem
        number={1}
        text="Upload a clear photo of your Driver's License."
      />
      <InstructionItem
        number={2}
        text="Provide Vehicle Registration and Insurance details."
      />
      <InstructionItem
        number={3}
        text="Complete the safety background check."
      />

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle"
          size={ms(20)}
          color={theme.colors.secondary}
        />
        <Text style={styles.infoText}>
          Verification usually takes 24–48 hours after all documents are
          submitted.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* TOP SECTION */}
      <View style={styles.topSection}>
        <LinearGradient
          colors={[theme.colors.primaryDark, theme.colors.primary]}
          style={styles.gradient}
        />
        <View
          style={[styles.headerContent, { paddingTop: insets.top + vs(20) }]}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={STEPS[currentStep].icon}
              size={ms(40)}
              color="#FFFFFF"
            />
          </View>

          <Text style={styles.welcomeTitle}>{STEPS[currentStep].title}</Text>

          <Text style={styles.welcomeSubtitle}>
            {STEPS[currentStep].subtitle}
          </Text>
        </View>
      </View>

      {/* BOTTOM SECTION */}
      <View style={styles.bottomSection}>
        <View style={styles.tabsIndicatorContainer}>
          {(Object.keys(STEPS) as OnboardingStep[]).map((step) => (
            <View
              key={step}
              style={[
                styles.stepDot,
                currentStep === step ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {currentStep === "welcome" && renderInstructions()}
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, vs(20)),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep("documents")}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={ms(20)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/* -------------------------------- Helpers --------------------------------- */

const InstructionItem = ({
  number,
  text,
}: {
  number: number;
  text: string;
}) => (
  <View style={styles.instructionRow}>
    <View style={styles.numberBadge}>
      <Text style={styles.numberText}>{number}</Text>
    </View>
    <Text style={styles.instructionText}>{text}</Text>
  </View>
);

/* -------------------------------- Styles ---------------------------------- */

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primaryDark,
  },

  topSection: {
    height: hp(40),
    justifyContent: "center",
    alignItems: "center",
  },

  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  headerContent: {
    alignItems: "center",
    paddingHorizontal: s(30),
  },

  iconCircle: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(20),
  },

  welcomeTitle: {
    ...(theme.typography.h1 as TextStyle),
    color: "#FFFFFF",
    textAlign: "center",
  } as TextStyle,

  welcomeSubtitle: {
    ...(theme.typography.body as TextStyle),
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: vs(8),
  } as TextStyle,

  bottomSection: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    marginTop: vs(-30),
    paddingTop: vs(20),
  },

  tabsIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: s(8),
    marginBottom: vs(20),
  },

  stepDot: {
    height: vs(4),
    borderRadius: theme.borderRadius.full,
  },

  activeDot: {
    width: s(24),
    backgroundColor: theme.colors.primary,
  },

  inactiveDot: {
    width: s(8),
    backgroundColor: theme.colors.border,
  },

  scrollContent: {
    paddingHorizontal: s(24),
    paddingBottom: vs(100),
  },

  tabContent: {
    flex: 1,
  },

  sectionTitle: {
    ...(theme.typography.h3 as TextStyle),
    color: theme.colors.text,
    marginBottom: vs(20),
  } as TextStyle,

  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(16),
  },

  numberBadge: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: s(12),
  },

  numberText: {
    ...(theme.typography.caption as TextStyle),
    color: theme.colors.primaryDark,
  } as TextStyle,

  instructionText: {
    ...(theme.typography.bodySmall as TextStyle),
    color: theme.colors.textSecondary,
    flex: 1,
  } as TextStyle,

  infoBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.background,
    padding: s(16),
    borderRadius: theme.borderRadius.md,
    marginTop: vs(20),
    alignItems: "center",
    gap: s(10),
  },

  infoText: {
    ...(theme.typography.caption as TextStyle),
    color: theme.colors.textSecondary,
    flex: 1,
  } as TextStyle,

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: s(24),
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  primaryButton: {
    backgroundColor: theme.colors.black,
    height: vs(56),
    borderRadius: theme.borderRadius.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: s(10),
  },

  buttonText: {
    ...(theme.typography.body as TextStyle),
    color: "#FFFFFF",
    fontWeight: "700",
  } as TextStyle,
});

export default DriverOnboarding;
