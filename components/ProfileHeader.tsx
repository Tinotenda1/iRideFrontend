import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../constants/theme";
import { api, getApiBaseUrl } from "../utils/api";
import { ms } from "../utils/responsive";
import { getUserInfo, storeUserInfo } from "../utils/storage";
import { createStyles, typedTypography } from "../utils/styles";
import { IRAvatar } from "./IRAvatar";

interface ProfileHeaderProps {
  showRating?: boolean;
  size?: "sm" | "md" | "lg";
  layout?: "horizontal" | "vertical";
}

interface UserProfileData {
  name: string;
  profilePic?: string;
  rating?: number;
  userType?: "passenger" | "driver";
}

const AVATAR_SIZE_PX = {
  sm: 40,
  md: 56,
  lg: 72,
};

const getAvatarPixelSize = (size: "sm" | "md" | "lg") =>
  AVATAR_SIZE_PX[size] || AVATAR_SIZE_PX.md;

const getFullImagePath = (path: string | undefined | null) => {
  if (!path) return null;
  if (
    path.startsWith("file://") ||
    path.startsWith("content://") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  try {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}${path}`;
  } catch (e) {
    return path;
  }
};

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  showRating = true,
  size = "md",
  layout = "horizontal",
}) => {
  const [userData, setUserData] = React.useState<UserProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userInfo = await getUserInfo();
      if (userInfo) {
        const fullName =
          `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim();
        setUserData({
          name: fullName || "User",
          profilePic: getFullImagePath(userInfo.profilePic) || undefined,
          rating: 4.8,
          userType: userInfo.userType,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPhoto = async () => {
    if (userData?.userType === "driver") {
      Alert.alert(
        "Action Not Allowed",
        "Driver profile photos can only be updated through support.",
      );
      return;
    }

    // Capture the original state to revert if everything fails
    const originalPhoto = userData?.profilePic;
    const originalUserInfo = await getUserInfo();

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera access is required.");
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
        setUpdating(true);
        const newLocalUri = result.assets[0].uri;

        // 1. OPTIMISTIC UPDATE: Set the new photo immediately
        if (originalUserInfo) {
          await storeUserInfo({ ...originalUserInfo, profilePic: newLocalUri });
        }
        setUserData((prev) =>
          prev ? { ...prev, profilePic: newLocalUri } : null,
        );

        // 2. PREPARE FORM DATA
        const formData = new FormData();
        const filename = newLocalUri.split("/").pop() || "profile.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("profilePic", {
          uri: newLocalUri,
          name: filename,
          type,
        } as any);

        // 3. RETRY LOOP
        let attempts = 0;
        let success = false;
        const MAX_ATTEMPTS = 3;

        while (attempts < MAX_ATTEMPTS && !success) {
          try {
            attempts++;
            const response = await api.post("/auth/profile/picture", formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 30000,
            });

            if (response.data?.success) {
              success = true;
              const serverPath = response.data.user?.profile_pic;

              // 4. PERSIST PERMANENT PATH
              if (originalUserInfo && serverPath) {
                await storeUserInfo({
                  ...originalUserInfo,
                  profilePic: serverPath,
                });
              }

              setUpdating(false);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 1500);
            }
          } catch (err) {
            console.warn(`Drift Sync Attempt ${attempts} failed:`, err);
            if (attempts === MAX_ATTEMPTS) throw err; // Final fail triggers the 'catch' block
            await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait before retry
          }
        }
      }
    } catch (error) {
      console.error("📸 Final Sync Failure, Reverting:", error);

      // 5. REVERSION LOGIC: Put everything back the way it was
      setUpdating(false);

      if (originalUserInfo) {
        await storeUserInfo(originalUserInfo);
      }

      setUserData((prev) =>
        prev ? { ...prev, profilePic: originalPhoto } : null,
      );

      Alert.alert(
        "Update Failed",
        "We couldn't sync your photo after multiple attempts. Reverting to your previous profile picture.",
      );
    } finally {
      // Ensure loader is off even if user cancels the picker
      setUpdating(false);
    }
  };

  const isDriver = userData?.userType === "driver";
  const nameStyle =
    size === "sm"
      ? styles.textSm
      : size === "lg"
        ? styles.textLg
        : styles.textMd;

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      let iconName: any = "star-outline";
      let color = theme.colors.border;

      if (i < fullStars) {
        iconName = "star";
        color = theme.colors.primary;
      } else if (i === fullStars && hasHalfStar) {
        iconName = "star-half";
        color = theme.colors.primary;
      }

      stars.push(<Ionicons key={i} name={iconName} size={14} color={color} />);
    }
    return stars;
  };

  if (loading || !userData) return <View style={styles.container} />;

  return (
    <>
      <View
        style={[
          styles.container,
          layout === "vertical" && styles.verticalLayout,
        ]}
      >
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            onPress={() => userData.profilePic && setShowImageModal(true)}
            disabled={!userData.profilePic || updating}
            activeOpacity={0.7}
          >
            <IRAvatar
              source={
                userData.profilePic ? { uri: userData.profilePic } : undefined
              }
              name={userData.name}
              size={size}
              variant="circle"
            />

            {(updating || showSuccess) && (
              <View
                style={[
                  styles.loaderOverlay,
                  showSuccess && { backgroundColor: "rgba(76, 175, 80, 0.8)" },
                ]}
              >
                {updating ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.surface}
                    />
                    <Text style={styles.syncText}>Syncing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={ms(24)}
                      color={theme.colors.surface}
                    />
                    <Text style={styles.syncText}>Saved</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          {!isDriver && (
            <TouchableOpacity
              style={styles.editBadge}
              onPress={handleEditPhoto}
              disabled={updating || showSuccess}
              activeOpacity={0.8}
            >
              <Ionicons
                name="pencil"
                size={ms(12)}
                color={theme.colors.surface}
              />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.textContainer,
            layout === "vertical" && styles.verticalTextContainer,
          ]}
        >
          <Text style={[styles.userName, nameStyle]} numberOfLines={1}>
            {userData.name}
          </Text>

          {showRating && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(userData.rating || 5)}
              </View>
              <Text style={styles.ratingText}>
                {(userData.rating || 5).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity
          style={styles.fullScreenContainer}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <BlurView intensity={90} tint="light" style={styles.blurBackground} />
          <View style={styles.imageContent}>
            <View
              style={[
                styles.modalImageWrapper,
                { width: ms(280), height: ms(280), borderRadius: ms(140) },
              ]}
            >
              <Image
                source={{ uri: userData.profilePic }}
                style={styles.fullScreenImage}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = createStyles({
  container: { flexDirection: "row", alignItems: "center" },
  verticalLayout: { flexDirection: "column", alignItems: "center" },
  avatarWrapper: {
    position: "relative",
  },
  textContainer: { marginLeft: theme.spacing.md },
  verticalTextContainer: {
    marginLeft: 0,
    marginTop: theme.spacing.sm,
    alignItems: "center",
  },
  userName: { fontWeight: "600", color: theme.colors.text },
  textSm: { fontSize: ms(14) },
  textMd: { fontSize: ms(16) },
  textLg: { fontSize: ms(18) },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  starsContainer: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: {
    ...typedTypography.caption,
    color: theme.colors.text,
    fontWeight: "600",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.surface,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fullScreenContainer: { flex: 1 },
  blurBackground: { ...StyleSheet.absoluteFillObject },
  imageContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalImageWrapper: {
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fullScreenImage: { width: "100%", height: "100%" },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.black,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  syncText: {
    fontSize: ms(9),
    color: theme.colors.surface,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
