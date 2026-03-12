import "dotenv/config";

export default {
  expo: {
    name: "Drift",
    slug: "Drift",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "irideapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.drift.app",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription:
          "Drift uses your location to show nearby drivers.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Drift tracks location for ride accuracy.",
        NSLocationAlwaysUsageDescription:
          "Drift tracks location even when closed for safety.",
      },
    },
    android: {
      package: "com.drift.app",
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "SYSTEM_ALERT_WINDOW",
        "FOREGROUND_SERVICE_LOCATION",
      ],
    },
    extra: {
      eas: {
        projectId: "c7da1c55-8235-4a51-9539-cb7bf583d0ce",
      },
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      respondedRideTimeout:
        process.env.RESPONDED_RIDE_REQUEST_CARD_AUTO_REMOVAL_DELAY,
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", { backgroundColor: "#ffffff" }],
      ["expo-location", { isAndroidBackgroundLocationEnabled: true }],
      "expo-secure-store",
      "expo-font",
    ],
  },
};
