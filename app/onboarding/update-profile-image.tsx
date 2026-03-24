// app/onboarding/update-profile-image.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IRButton } from "../../components/IRButton";
import { IRHeader } from "../../components/IRHeader";
import { IRLoading } from "../../components/IRLoading";
import { theme } from "../../constants/theme";
import { getApiBaseUrl } from "../../utils/api";
import { getUserInfo, storeUserInfo } from "../../utils/storage";
import { createStyles, typedTypography } from "../../utils/styles";

export default function UpdateProfileImage() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExistingImage, setHasExistingImage] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    loadUserImage();
    requestCameraPermission();
  }, []);

  const resolveImagePath = (path: string | null | undefined) => {
    if (!path) return null;
    if (
      path.startsWith("file://") ||
      path.startsWith("content://") ||
      path.startsWith("data:")
    ) {
      return path;
    }
    if (path.startsWith("http")) return path;

    try {
      const baseUrl = getApiBaseUrl();
      const normalizedBase = baseUrl.endsWith("/")
        ? baseUrl.slice(0, -1)
        : baseUrl;
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return `${normalizedBase}${cleanPath}`;
    } catch (e) {
      console.error("❌ Error resolving image path:", e);
      return null;
    }
  };

  const loadUserImage = async () => {
    try {
      const userInfo = await getUserInfo();
      setUserType(userInfo?.userType || "passenger");

      if (userInfo?.profilePic) {
        setProfileImage(userInfo.profilePic);
        setHasExistingImage(true);
      }
    } catch (error) {
      console.error("Error loading user image:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please grant camera permission to take a selfie for your profile image.",
        [{ text: "OK" }],
      );
    }
  };

  const handleTakeSelfie = async () => {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== "granted") {
        await requestCameraPermission();
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setProfileImage(asset.uri);
        await saveImageLocally(asset.uri);
      }
    } catch (error: any) {
      console.error("Error taking selfie:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const saveImageLocally = async (imageUri: string) => {
    setUploading(true);
    try {
      const userInfo = await getUserInfo();
      if (!userInfo) {
        Alert.alert("Error", "User information not found.");
        return;
      }

      const updatedUserInfo = { ...userInfo, profilePic: imageUri };
      await storeUserInfo(updatedUserInfo);

      setProfileImage(imageUri);
      setHasExistingImage(true);
      Alert.alert("Success", "Profile image updated!");
    } catch (error: any) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    router.push("/onboarding/user-type-selection" as any);
  };

  const handleBack = () => {
    router.back();
  };

  // Personalized Content Logic
  const isDriver = userType === "driver";

  const getHeaderText = () => {
    if (isDriver)
      return hasExistingImage
        ? "Verified Profile Photo"
        : "Professional Photo Required";
    return hasExistingImage
      ? "Your Profile Image"
      : "Set up your profile image";
  };

  const getSubtitleText = () => {
    if (isDriver)
      return "Drivers must provide a clear photo for safety and trust.";
    return hasExistingImage
      ? "We found your existing profile image"
      : "Add a photo to personalize your account";
  };

  const getBodyMessage = () => {
    if (isDriver) {
      return hasExistingImage
        ? "This photo will be visible to your passengers. For security reasons, driver profile photos cannot be changed once the onboarding is complete."
        : "Make sure your face is clearly visible. Note: Once set, you won't be able to change this photo yourself as it is used for security verification.";
    }
    return hasExistingImage
      ? "This is your current profile image. You can update it if you'd like, or keep it as is."
      : "Setting up a profile image is recommended and will help you get more rides and be prioritized by drivers.";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <IRLoading text="Loading your profile..." overlay />
      </SafeAreaView>
    );
  }

  const resolvedUri = resolveImagePath(profileImage);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <IRHeader title={getHeaderText()} subtitle={getSubtitleText()} />

          <View style={styles.imageSection}>
            <View
              style={[
                styles.imageWrapper,
                isDriver && {
                  borderColor: theme.colors.primary,
                  borderWidth: 4,
                },
              ]}
            >
              {resolvedUri ? (
                <Image
                  source={{ uri: resolvedUri }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons
                    name="person"
                    size={80}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>{getBodyMessage()}</Text>
          </View>

          <View style={styles.buttonContainer}>
            {/* 🚫 Hide "Update/Set Photo" button entirely if driver already has an image */}
            {(!isDriver || !hasExistingImage) && (
              <IRButton
                title={profileImage ? "Update Photo" : "Take Selfie"}
                onPress={handleTakeSelfie}
                variant="outline"
                loading={uploading}
                disabled={uploading}
                fullWidth
                leftIcon={
                  <Ionicons
                    name="camera"
                    size={20}
                    color={theme.colors.primary}
                  />
                }
              />
            )}

            <IRButton
              title={isDriver || hasExistingImage ? "Continue" : "Skip for now"}
              onPress={handleNext}
              variant="primary"
              disabled={uploading || (isDriver && !hasExistingImage)} // Force drivers to take a photo if they don't have one
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
    paddingTop: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  imageSection: {
    marginTop: theme.spacing.xl,
    alignItems: "center",
  },
  imageWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    ...theme.shadows.lg,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  messageContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  message: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
});
