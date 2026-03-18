// app/driver/components/ExternalNavButton.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

interface NavCoords {
  latitude: number;
  longitude: number;
}

interface ExternalNavButtonProps {
  status: string | undefined;
  pickup: NavCoords | null;
  destination: NavCoords | null;
  style?: ViewStyle;
  size?: number;
}

const ExternalNavButton: React.FC<ExternalNavButtonProps> = ({
  status,
  pickup,
  destination,
  style,
  size = s(40), // Made default size responsive
}) => {
  const handleOpenNavigation = async () => {
    // 1. Determine target based on status
    // If 'matched', we go to pickup.
    // If 'arrived' (waiting for passenger) or 'on_trip', we go to destination.
    const targetCoords = status === "matched" ? pickup : destination;
    const label = status === "matched" ? "Pickup" : "Destination";

    if (!targetCoords) return;

    const { latitude, longitude } = targetCoords;
    const latLng = `${latitude},${longitude}`;

    // 2. Define platform-specific deep link schemes
    const scheme = Platform.select({
      ios: `maps://0,0?q=${label}@`,
      android: "google.navigation:q=",
    });

    const url = `${scheme}${latLng}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to web browser
        const browserUrl = Platform.select({
          ios: `http://maps.apple.com/?q=${latLng}`,
          android: `https://www.google.com/maps/dir/?api=1&destination=${latLng}`,
        });
        if (browserUrl) await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error("Navigation Error:", error);
    }
  };

  // Only show the button if we are in a state that requires navigation
  const isActive = ["matched", "arrived", "on_trip"].includes(status || "");
  if (!isActive) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.button,
        { height: size, borderRadius: size / 2, paddingHorizontal: s(18) },
        style,
      ]}
      onPress={handleOpenNavigation}
    >
      <MaterialCommunityIcons
        name={Platform.OS === "ios" ? "map-marker-path" : "google-maps"}
        size={size * 0.45}
        color={Platform.OS === "ios" ? "#007AFF" : "#4285F4"}
      />

      <Text style={styles.text}>Navigate</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    borderWidth: 2,
    borderColor: "#0084FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    marginLeft: s(8),
    fontSize: ms(16),
    fontWeight: "600",
    color: "#333",
  },
});

export default ExternalNavButton;
