import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { IRButton } from "../../components/IRButton";
import { IRHeader } from "../../components/IRHeader";
import OTPInput from "../../components/OTPInput";
import { theme } from "../../constants/theme";
import { api } from "../../utils/api";
import { ROUTES } from "../../utils/routes";
import { createUserInfoFromResponse, getOrCreateDeviceId, storeAuthToken, storeUserInfo } from "../../utils/storage";
import { createStyles, typedTypography } from "../../utils/styles";
 


export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;
  const method = Array.isArray(params.method) ? params.method[0] : params.method;

  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const verifyOTP = async (code: string) => {
    if (!code || code.length !== 6) return;
    setIsVerifying(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await api.post("/auth/verify", { phone, code, deviceId });
      const { token, user, nextStep } = response.data;

      if (!token) throw new Error("No authentication token received");

      // Store auth token
      await storeAuthToken(token);

      // Create user info
      const userInfo = createUserInfoFromResponse(user, phone);

      // Add userId and phone explicitly to local storage
      await storeUserInfo({ 
        ...userInfo, 
        deviceId, 
        id: user.id || user._id,  // make sure you save the backend id
        phone: phone                  // store the phone locally too
      });

      if (nextStep === "dashboard" || user?.profileCompleted) {
        const userType = user?.userType || userInfo.userType;
        router.replace(userType === "driver" ? ROUTES.DRIVER.HOME : ROUTES.PASSENGER.HOME);
      } else {
        router.replace(ROUTES.ONBOARDING.WELCOME);
      }
    } catch (error: any) {
      let errorMessage = error?.response?.data?.message || error?.message || "Invalid verification code";
      Alert.alert("Verification Failed", errorMessage);
      setOtpResetKey((prev) => prev + 1);
    } finally {
      setIsVerifying(false);
    }
  };


  const handleResendCode = async () => {
    if (!canResend || !phone || !method) return;
    try {
      await api.post("/auth/request-code", { phone, method });
      setTimeLeft(60);
      setCanResend(false);
      setOtpResetKey((prev) => prev + 1);
      Alert.alert("Success", "Verification code has been resent.");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to resend code.";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">     
          <IRHeader
            title="Verify your number"
            subtitle={`Enter the 6 digit code sent to ${phone || "your phone"} via ${method || "SMS"}`}
          />

          <OTPInput key={otpResetKey} length={6} onComplete={verifyOTP} autoFocus resetKey={otpResetKey} />
          {isVerifying && (
            <View style={{ alignItems: "center", marginVertical: theme.spacing.lg }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>Verifying...</Text>
            </View>
          )}
          <View style={styles.timerContainer}>
            {!canResend ? (
              <Text style={styles.timerText}>Resend code in {formatTime(timeLeft)}</Text>
            ) : (
              <IRButton title="Send another code" onPress={handleResendCode} variant="outline" size="sm" fullWidth={false} />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { flexGrow: 1, padding: theme.spacing.lg, paddingTop: theme.spacing.xxl },
  timerContainer: { alignItems: "center", marginTop: theme.spacing.lg },
  timerText: { ...typedTypography.body, color: theme.colors.textSecondary },
});
