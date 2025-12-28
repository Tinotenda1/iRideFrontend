// components/SessionChecker.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { theme } from "../constants/theme";
import { ROUTES } from "../utils/routes";
import { checkUserSession, handleDeviceMismatch, validateDeviceId } from "../utils/storage";

export default function SessionChecker() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSessionAndRedirect = async () => {
      try {
        console.log("🔐 Checking user session and device...");
        const [session, deviceValidation] = await Promise.all([
          checkUserSession(),
          validateDeviceId()
        ]);

        console.log("📊 Session & Device status:", {
          isAuthenticated: session.isAuthenticated,
          onboardingCompleted: session.onboardingCompleted,
          deviceValid: deviceValidation.isValid,
          isNewDevice: deviceValidation.isNewDevice
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!isMounted) return;

        // ✅ DEVICE VALIDATION: If device doesn't match, force logout
        if (session.isAuthenticated && !deviceValidation.isValid) {
          console.log('🚫 Device mismatch detected at app launch');
          await handleDeviceMismatch();
          
          Alert.alert(
            'Account Moved',
            'Your account is now active on another device. Please login again.',
            [{ 
              text: 'OK', 
              onPress: () => {
                if (isMounted) setIsChecking(false);
                router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
              }
            }]
          );
          return;
        }

        // ✅ NORMAL FLOW: Continue with session-based routing
        if (session.isAuthenticated && session.onboardingCompleted && deviceValidation.isValid) {
          if (session.userInfo?.userType === "driver") {
            router.replace(ROUTES.DRIVER.HOME as never);
          } else {
            router.replace(ROUTES.PASSENGER.HOME as never);
          }
        } else if (!session.isAuthenticated) {
          router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
        } else {
          router.replace(ROUTES.ONBOARDING.WELCOME as never);
        }

      } catch (error) {
        console.error("❌ Error checking session:", error);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    checkSessionAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return null; // Nothing else to render
}