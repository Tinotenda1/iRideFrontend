// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { initializeAuthToken } from "../utils/api";
import { RideBookingProvider } from "./context/RideBookingContext";

export default function RootLayout() {
  useEffect(() => {
    initializeAuthToken();
  }, []);

  return (
    <RideBookingProvider>
        <Stack screenOptions={{ headerShown: false }} />
    </RideBookingProvider>
  );
}
