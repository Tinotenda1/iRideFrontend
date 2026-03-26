// components/Logout.tsx - Safe Version
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../constants/theme";
import { ROUTES } from "../utils/routes";
import { clearAuthData } from "../utils/storage";

export const LogoutButton: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsLoading(false),
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: performLogout,
        },
      ],
      { cancelable: true },
    );
  };

  const performLogout = async () => {
    try {
      setIsLoading(true);
      await clearAuthData();
      router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleLogout} disabled={isLoading}>
        <View style={styles.content}>
          <Ionicons
            name="log-out-outline"
            size={ms(20)}
            color={theme.colors.black}
            style={{
              marginRight: s(0), // Removed margin since the label is gone
              transform: [{ scaleX: -1 }], // This flips the icon horizontally
            }}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: vs(50),
    width: vs(50),
    borderRadius: ms(50),
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  touchable: {
    paddingHorizontal: s(16), // Responsive horizontal padding
    paddingVertical: vs(12),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: ms(16), // Responsive font size
    fontWeight: "600",
    color: "#666",
  },
  iconPlaceholder: {
    marginLeft: s(8),
  },
  arrow: {
    fontSize: ms(18),
    color: "#666",
  },
});
