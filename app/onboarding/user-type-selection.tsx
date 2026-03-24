// app/onboarding/user-type-selection.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IRButton } from "../../components/IRButton";
import { IRHeader } from "../../components/IRHeader";
import { theme } from "../../constants/theme";
import { api } from "../../utils/api";
import { ROUTES } from "../../utils/routes";
import {
  completeOnboarding,
  getUserInfo,
  updateUserInfo,
} from "../../utils/storage";
import { createStyles } from "../../utils/styles";

export default function AllSetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAlreadyDriver, setIsAlreadyDriver] = useState(false); // Added state for text personalization
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check status on mount to personalize the UI immediately
    const checkStatus = async () => {
      const userInfo = await getUserInfo();
      if (userInfo?.userType === "driver") {
        setIsAlreadyDriver(true);
      }
    };
    checkStatus();

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);

    try {
      const userInfo = await getUserInfo();
      if (!userInfo) throw new Error("No user information found");

      const isAlreadyDriver = userInfo.userType === "driver";
      const targetUserType = isAlreadyDriver ? "driver" : "passenger";

      const formData = new FormData();
      formData.append("firstName", userInfo.firstName || "");
      formData.append("lastName", userInfo.lastName || "");
      formData.append("city", userInfo.city || "");
      formData.append("userType", targetUserType);
      formData.append("profileCompleted", "true");

      // ✅ Only append the image if it's a NEW local file (starts with file:// or content://)
      // If it's already a server path or null, we skip this to avoid Network Errors
      // 1. Check if the current profilePic is a local URI that needs uploading
      const isLocalUri =
        userInfo.profilePic?.startsWith("file://") ||
        userInfo.profilePic?.startsWith("content://");

      // 2. Only append if it's local
      if (userInfo.profilePic && isLocalUri) {
        const uri = userInfo.profilePic;
        const fileType = uri.split(".").pop();
        const fileName = `profile_${Date.now()}.${fileType}`;

        formData.append("profilePic", {
          uri,
          name: fileName,
          type: `image/${fileType}`,
        } as any);
      }

      // 4. Single request to sync everything to the server
      const response = await api.post("/auth/complete-profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        // Optional: add a longer timeout for image uploads
        timeout: 30000,
      });

      const finalUserData = {
        ...userInfo,
        ...response.data.user,
        profileCompleted: true,
        userType: targetUserType,
      };

      await updateUserInfo(finalUserData);
      await completeOnboarding({ userType: targetUserType });

      if (isAlreadyDriver) {
        router.replace(ROUTES.DRIVER.HOME as never);
      } else {
        router.replace(ROUTES.PASSENGER.HOME as never);
      }
    } catch (error: any) {
      console.error("❌ Finish Error:", error); // Check your console for the real error
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to finalize profile";
      Alert.alert(
        "Network Error",
        "Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.successWrapper}>
          <Animated.View
            style={[
              styles.iconCircle,
              { transform: [{ scale: checkmarkScale }] },
            ]}
          >
            <Ionicons name="checkmark" size={60} color={theme.colors.primary} />
          </Animated.View>

          <IRHeader
            title={isAlreadyDriver ? "Welcome Back!" : "You're all set!"}
            subtitle={
              isAlreadyDriver
                ? "Your driver profile is active and ready. Tap finish to return to the dashboard and start accepting ride requests."
                : "Your profile is ready. To become a driver, simply open the sidebar menu on the home screen and select the 'Become a Driver' button to start your Drift Driver journey."
            }
          />
        </View>

        <View style={styles.footer}>
          <IRButton
            title={loading ? "Finalizing..." : "Finish"}
            onPress={handleFinish}
            loading={loading}
            disabled={loading}
            fullWidth
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  successWrapper: {
    alignItems: "center",
    marginBottom: theme.spacing.xl * 2,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  footer: {
    width: "100%",
    paddingHorizontal: theme.spacing.lg,
    position: "absolute",
    bottom: theme.spacing.xl,
  },
});
