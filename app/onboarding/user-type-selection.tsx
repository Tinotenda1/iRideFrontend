// app/onboarding/user-type-selection.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics"; // Added for premium feel
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IRHeader } from "../../components/IRHeader";
import { theme } from "../../constants/theme";
import { api } from "../../utils/api";
import { ROUTES } from "../../utils/routes";
import {
  completeOnboarding,
  getUserInfo,
  updateUserInfo,
} from "../../utils/storage";
import { createStyles, typedTypography } from "../../utils/styles";

type UserType = "passenger" | "driver";

export default function UserTypeSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Scale animations for cards
  const passengerScale = useRef(new Animated.Value(1)).current;
  const driverScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const animatePress = (type: UserType, toValue: number) => {
    Animated.spring(type === "passenger" ? passengerScale : driverScale, {
      toValue,
      useNativeDriver: true,
      friction: 4,
      tension: 40,
    }).start();
  };

  const handleUserTypeSelect = useCallback(
    async (type: UserType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);
      setSelectedType(type);

      try {
        const userInfo = await getUserInfo();
        if (!userInfo) throw new Error("No user information found");

        const payload = {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          city: userInfo.city,
          userType: type,
          profilePic: userInfo.profilePic,
          profileCompleted: true,
        };

        const response = await api.post("/auth/complete-profile", payload);
        console.log("Profile completion response:", response.data);

        await updateUserInfo({ ...userInfo, ...payload });
        await completeOnboarding({ userType: type });

        router.replace(
          type === "driver" ? ROUTES.DRIVER.HOME : ROUTES.PASSENGER.HOME,
        );
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          error.message ||
          "Failed to complete profile";
        Alert.alert("Error", message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.textWrapper}>
          <IRHeader
            title="Choose your role"
            subtitle="Select how you want to use the platform today"
          />
        </View>

        <View style={styles.selectionContainer}>
          {(["passenger", "driver"] as const).map((type) => {
            const isSelected = selectedType === type;
            const scaleValue =
              type === "passenger" ? passengerScale : driverScale;

            return (
              <Pressable
                key={type}
                disabled={loading}
                onPressIn={() => animatePress(type, 0.96)}
                onPressOut={() => animatePress(type, 1)}
                onPress={() => handleUserTypeSelect(type)}
              >
                <Animated.View
                  style={[
                    styles.selectionCard,
                    isSelected && styles.selectedCard,
                    loading && styles.disabledCard,
                    { transform: [{ scale: scaleValue }] },
                  ]}
                >
                  <View style={styles.cardContentHorizontal}>
                    <View
                      style={[
                        styles.cardIcon,
                        type === "driver"
                          ? { backgroundColor: theme.colors.secondary + "15" }
                          : { backgroundColor: theme.colors.primary + "15" },
                      ]}
                    >
                      <Ionicons
                        name={
                          type === "driver" ? "car-outline" : "person-outline"
                        }
                        size={28}
                        color={
                          type === "driver"
                            ? theme.colors.secondary
                            : theme.colors.primary
                        }
                      />
                    </View>

                    <View style={styles.cardTextContent}>
                      <Text style={styles.cardTitle}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      <Text style={styles.cardDescription}>
                        {type === "driver"
                          ? "Earn money on your schedule"
                          : "Get a reliable ride in minutes"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        isSelected &&
                          (type === "driver"
                            ? styles.radioSelectedDriver
                            : styles.radioSelectedPassenger),
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </View>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>

        {loading && (
          <Animated.View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Setting up your workspace...</Text>
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  textWrapper: {
    marginBottom: theme.spacing.xl,
  },
  selectionContainer: { gap: theme.spacing.md },
  selectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...theme.shadows.sm,
  },
  selectedCard: {
    borderColor: theme.colors.primary + "40",
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  cardContentHorizontal: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  cardTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    fontWeight: "700",
  },
  cardDescription: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: theme.spacing.sm,
  },
  radioSelectedPassenger: { borderColor: theme.colors.primary },
  radioSelectedDriver: { borderColor: theme.colors.secondary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary, // You can dynamic this if needed
  },
  disabledCard: { opacity: 0.6 },
  loadingOverlay: {
    marginTop: theme.spacing.xl * 2,
    alignItems: "center",
    gap: theme.spacing.md,
  },
  loadingText: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
});
