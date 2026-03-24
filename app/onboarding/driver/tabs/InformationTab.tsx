// app/onboarding/driver/tabs/InformationTab.tsx
import { getApiBaseUrl } from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { theme } from "../../../../constants/theme";
import { ms, s, vs } from "../../../../utils/responsive";
import { getUserInfo } from "../../../../utils/storage";
import { createStyles } from "../../../../utils/styles";

interface InformationTabProps {
  profileImage: string | null;
  setProfileImage: (uri: string | null) => void;
  name: string;
  setName: (text: string) => void;
  city: string;
  setCity: (text: string) => void;

  fullNameTrayRef: any;
  cityTrayRef: any;
}

export default function InformationTab({
  profileImage,
  setProfileImage,
  name,
  setName,
  city,
  setCity,
  cityTrayRef,
  fullNameTrayRef,
}: InformationTabProps) {
  const [loading, setLoading] = useState(true);

  // Helper to resolve the image path correctly
  const getFullImagePath = (path: string | null | undefined) => {
    if (!path) {
      console.log("📸 [getFullImagePath] No path found in storage");
      return null;
    }

    // Check if it's a local URI from a fresh camera take
    if (
      path.startsWith("file://") ||
      path.startsWith("content://") ||
      path.startsWith("data:")
    ) {
      //console.log("📸 [getFullImagePath] Detected local URI:", path);
      return path;
    }

    // Construct the backend URL
    const baseUrl = getApiBaseUrl();
    // Ensure we don't have double slashes if the baseUrl ends with one
    const sanitizedBase = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;
    const sanitizedPath = path.startsWith("/") ? path : `/${path}`;

    const fullPath = `${sanitizedBase}${sanitizedPath}`;
    //console.log("📸 [getFullImagePath] Final Backend URL:", fullPath);
    return fullPath;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userInfo = await getUserInfo();
        if (userInfo) {
          const rawPath = userInfo.profilePic; // Check both naming conventions
          const formattedImagePath = getFullImagePath(rawPath);

          if (formattedImagePath) {
            // FIX: Only skip update if the current profileImage is ALREADY a full URL or local file
            const isAlreadyFullUrl =
              profileImage?.startsWith("http") ||
              profileImage?.startsWith("file");

            if (!isAlreadyFullUrl) {
              console.log(
                "📸 [useEffect] Updating state with full backend URL:",
                formattedImagePath,
              );
              setProfileImage(formattedImagePath);
            }
          }

          if (!name) setName(userInfo.name || "");
          if (!city) setCity(userInfo.city || "");
        }
      } catch (error) {
        console.error("📸 [useEffect] Error loading user info:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, [profileImage]); // Add profileImage to dependency to re-check if parent updates it

  const handleTakeSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera access is required for a profile photo.",
        );
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
        const localUri = result.assets[0].uri;
        //console.log("📸 [handleTakeSelfie] Local URI captured:", localUri);
        setProfileImage(localUri);
      }
    } catch (error) {
      console.error("📸 [handleTakeSelfie] Error taking selfie:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <View style={{ position: "relative" }}>
            {/* Wrapper to keep badge anchored to the circle */}
            <TouchableOpacity
              onPress={handleTakeSelfie}
              style={styles.imageWrapper}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                  onLoadStart={() =>
                    console.log(
                      "📸 [Image Component] Starting load for:",
                      profileImage,
                    )
                  }
                  onLoad={() =>
                    console.log("📸 [Image Component] Successfully loaded")
                  }
                  onError={(e) =>
                    console.error(
                      "📸 [Image Component] Failed to load. Error:",
                      e.nativeEvent.error,
                    )
                  }
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons
                    name="camera"
                    size={ms(40)}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.uploadText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Moved Badge OUTSIDE the overflow:hidden wrapper and added a zIndex */}
            <View style={styles.editBadge}>
              <Ionicons
                name="pencil"
                size={ms(14)}
                color={theme.colors.surface}
              />
            </View>
          </View>

          <Text style={styles.imageInstruction}>
            Take a clear selfie. This helps passengers identify you.
          </Text>
        </View>

        {/* Full Name Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TouchableOpacity
            style={styles.inputField}
            onPress={() => fullNameTrayRef.current?.open()}
          >
            <Text style={[styles.inputText, !name && styles.placeholderText]}>
              {name || "Enter your full name"}
            </Text>
            <Ionicons
              name="person-outline"
              size={ms(18)}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* City Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>City</Text>
          <TouchableOpacity
            style={styles.inputField}
            onPress={() => cityTrayRef.current?.open()}
          >
            <Text style={[styles.inputText, !city && styles.placeholderText]}>
              {city || "Select your city"}
            </Text>
            <Ionicons
              name="location-outline"
              size={ms(18)}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = createStyles({
  keyboardAvoidingView: { flex: 1 },
  container: { flex: 1, paddingTop: vs(10) },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: ms(16), color: theme.colors.textSecondary },

  imageSection: {
    alignItems: "center",
    marginBottom: vs(30),
  },
  imageWrapper: {
    width: ms(130),
    height: ms(130),
    borderRadius: ms(65),
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    position: "relative",
    overflow: "hidden",
  },
  profileImage: { width: "100%", height: "100%", borderRadius: ms(65) },
  placeholderContainer: {
    alignItems: "center",
  },
  uploadText: {
    fontSize: ms(12),
    color: theme.colors.primary,
    fontWeight: "600",
    marginTop: vs(4),
  },
  editBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: theme.colors.primary,
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  imageInstruction: {
    marginTop: vs(12),
    fontSize: ms(13),
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: s(20),
  },

  inputGroup: {
    marginBottom: vs(20),
  },
  inputLabel: {
    fontSize: ms(14),
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: vs(8),
    marginLeft: s(4),
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
    borderRadius: ms(15),
    paddingHorizontal: s(16),
    paddingVertical: vs(15),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputText: {
    fontSize: ms(16),
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
  },
});
