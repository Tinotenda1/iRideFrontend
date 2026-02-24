import "dotenv/config";

export default {
  expo: {
    name: "iRide",
    slug: "iRide",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "irideapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.yourname.irideapp",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
      infoPlist: {
        UIBackgroundModes: ["location", "fetch"],
        NSLocationWhenInUseUsageDescription:
          "iRideApp uses your location to show nearby drivers.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "iRideApp tracks location for ride accuracy.",
        NSLocationAlwaysUsageDescription:
          "iRideApp tracks location even when closed for safety.",
      },
    },
    android: {
      package: "com.yourname.irideapp",
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
        "FOREGROUND_SERVICE_LOCATION",
      ],
    },
    extra: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
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
