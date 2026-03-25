// app/onboarding/welcome.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IRButton } from "../../components/IRButton";
import { IRHeader } from "../../components/IRHeader";
import { IRInput } from "../../components/IRInput";
import { IRLoading } from "../../components/IRLoading";
import SearchableCity from "../../components/SearchableCity";
import { theme } from "../../constants/theme";
import { api } from "../../utils/api";
import {
  createUserInfoFromResponse,
  getUserInfo,
  storeUserInfo,
} from "../../utils/storage";
import { createStyles } from "../../utils/styles";

interface UserData {
  userId?: number;
  name?: string;
  city?: string;
  phone?: string;
  exists: boolean;
}

export default function Welcome() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData>({ exists: false });
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ name?: string; city?: string }>({});

  // Load user profile from storage or API
  // app/onboarding/welcome.tsx

  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log("🔍 [Drift Debug] Starting profile initialization...");

        // 1. Check Local Storage
        const userInfo = await getUserInfo();
        if (userInfo) {
          console.log("📦 [Local Storage] Found user data:", {
            id: userInfo.id,
            name: userInfo.name,
            hasProfilePic: !!userInfo.profilePic,
            city: userInfo.city,
          });

          const userHasName =
            !!userInfo.name && userInfo.name.trim().length > 0;
          setUserData({
            exists: userHasName,
            userId: userInfo.id,
            name: userInfo.name,
            city: userInfo.city,
            phone: userInfo.phone,
          });
          if (userInfo.city) setCity(userInfo.city);
          if (!userHasName && userInfo.name) setName(userInfo.name);
        } else {
          console.log("❓ [Local Storage] No local user info found.");
        }

        // 2. Sync with Backend
        console.log(
          "🌐 [Backend] Fetching fresh profile from /auth/profile...",
        );
        try {
          const response = await api.get("/auth/profile");

          if (response.data?.user) {
            console.log(
              "✅ [Backend] Raw user data retrieved:",
              response.data.user,
            );

            const backendUserInfo = createUserInfoFromResponse(
              response.data.user,
              phone,
            );

            // Log specific fields we care about for the next screen
            console.log("✨ [Backend] Processed Info:", {
              id: backendUserInfo.id,
              name: backendUserInfo.name,
              profilePicPath: backendUserInfo.profilePic, // This is the path we need for the next screen
              city: backendUserInfo.city,
            });

            await storeUserInfo(backendUserInfo);

            const userHasName =
              !!backendUserInfo.name && backendUserInfo.name.trim().length > 0;

            setUserData({
              exists: userHasName,
              userId: backendUserInfo.id,
              name: backendUserInfo.name,
              city: backendUserInfo.city,
              phone: backendUserInfo.phone,
            });

            if (backendUserInfo.city) setCity(backendUserInfo.city);
            if (!userHasName && backendUserInfo.name)
              setName(backendUserInfo.name);
          } else {
            console.warn(
              "⚠️ [Backend] API returned success but no user object found.",
            );
          }
        } catch (error: any) {
          if (
            error?.response?.status === 404 ||
            error?.response?.status === 401
          ) {
            console.log(
              "ℹ️ [Backend] User not found or unauthorized (New User flow).",
            );
            if (!userData.phone)
              setUserData((prev) => ({ ...prev, exists: false, phone: phone }));
          } else {
            console.error("❌ [Backend] Error syncing profile:", error.message);
          }
        }
      } catch (error) {
        console.error("❌ [Critical] Error in loadUserData loop:", error);
      } finally {
        setLoading(false);
        console.log("🏁 [Drift Debug] Initialization sequence complete.");
      }
    };

    loadUserData();
  }, [phone]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; city?: string } = {};

    // Only validate name if user doesn't exist in database
    if (!userData.exists && !name.trim())
      newErrors.name = "Please enter your name";
    if (!city.trim()) newErrors.city = "Please enter your city";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save user info and go to next
  const handleNext = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const storedUserInfo = await getUserInfo();

      // Always ensure phone is set
      const phoneToUse = phone || storedUserInfo?.phone || userData.phone;

      if (!phoneToUse) {
        Alert.alert("Error", "Phone number is missing.");
        return;
      }

      const updatedUserInfo = {
        ...(storedUserInfo ?? {}),
        id: storedUserInfo?.id || userData.userId,
        phone: phoneToUse,
        name: userData.exists
          ? storedUserInfo?.name || userData.name
          : name.trim(),
        firstName: userData.exists ? storedUserInfo?.firstName : firstName,
        lastName: userData.exists ? storedUserInfo?.lastName : lastName,
        city: city.trim(),
        exists: true, // Now they will exist after this step
      };

      await storeUserInfo(updatedUserInfo);

      router.push("/onboarding/update-profile-image" as any);
    } catch (error) {
      console.error("Error storing user info:", error);
      Alert.alert(
        "Error",
        "Failed to save your information. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <IRLoading text="Loading your profile..." overlay />
      </SafeAreaView>
    );
  }

  const heading =
    userData.exists && userData.name
      ? `Welcome back, ${userData.name}!`
      : "Welcome!";

  const message = userData.exists
    ? "We'd love to know your city to help you find the best rides nearby."
    : "Let's get to know you! Please share your name and city to personalize your experience.";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <IRHeader title={heading} subtitle={message} />

          <View style={styles.form}>
            {/* Only show name input if user doesn't exist in database */}
            {!userData.exists && (
              <IRInput
                placeholder="Enter your full name"
                value={name}
                onChangeText={(text: string) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                error={errors.name}
                autoFocus={true}
                autoCapitalize="words"
              />
            )}

            <SearchableCity
              placeholder="Search for your city..."
              value={city}
              onChangeText={(text: string) => {
                setCity(text);
                if (errors.city) setErrors({ ...errors, city: undefined });
              }}
              error={errors.city}
              autoFocus={userData.exists} // Auto-focus city if user exists
            />
          </View>

          <View style={styles.buttonContainer}>
            <IRButton
              title="Next"
              onPress={handleNext}
              variant="primary"
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
            />
          </View>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  form: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: theme.spacing.xl,
  },
});
