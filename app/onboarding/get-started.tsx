import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IRButton } from "../../components/IRButton";
import PhoneInput from "../../components/PhoneInput";
import { theme } from "../../constants/theme";
import { api } from "../../utils/api";
import { createStyles, typedTypography } from "../../utils/styles";

export default function GetStarted() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+263");
  const [loading, setLoading] = useState<"whatsapp" | "sms" | null>(null);

  const handleVerify = async (method: "sms" | "whatsapp"): Promise<void> => {
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    const cleanPhone = `${countryCode}${phoneNumber.replace(/\s/g, "")}`;

    setLoading(method);

    try {
      await api.post("/auth/request-code", {
        phone: cleanPhone,
        method: method,
      });

      router.push(
        `/onboarding/verify?phone=${encodeURIComponent(
          cleanPhone
        )}&method=${method}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send verification code.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* KEYBOARD HANDLER ADDED */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Get started with iRide</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to continue
            </Text>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <PhoneInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              countryCode={countryCode}
              onCountryChange={setCountryCode}
            />
          </View>
        </ScrollView>

        {/* NEW: STICKY BOTTOM BUTTONS */}
        <View style={{ padding: theme.spacing.lg }}>
          <IRButton
            title="Verify Using WhatsApp"
            onPress={() => handleVerify("whatsapp")}
            variant="primary"
            loading={loading === "whatsapp"}
            disabled={loading !== null}
            leftIcon={
              <Ionicons
                name="logo-whatsapp"
                size={22}
                color={theme.colors.surface}
              />
            }
            fullWidth
          />

          <View style={{ height: theme.spacing.md }} />

          <IRButton
            title="Verify Using SMS"
            onPress={() => handleVerify("sms")}
            variant="secondary"
            loading={loading === "sms"}
            disabled={loading !== null}
            leftIcon={
              <Ionicons
                name="paper-plane"
                size={22}
                color={theme.colors.surface}
              />
            }
            fullWidth
          />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            By continuing, you agree to iRide{"'"}s{" "}
            <Text style={styles.disclaimerLink}>Privacy Policy</Text> and{" "}
            <Text style={styles.disclaimerLink}>Terms & Conditions</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  title: {
    ...typedTypography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
    boarderRadius: theme.borderRadius.full,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  disclaimerContainer: {
    marginTop: "auto",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  disclaimerText: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  disclaimerLink: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
