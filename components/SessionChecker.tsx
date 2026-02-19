// components/SessionChecker.tsx
import { useRouter } from "expo-router";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { ROUTES } from "../utils/routes";
import {
  checkUserSession,
  handleDeviceMismatch,
  validateDeviceId,
} from "../utils/storage";

// --- Context to share session info across app ---
interface SessionContextType {
  userInfo: any | null;
  deviceId: string | null;
  deviceValid: boolean;
  isChecking: boolean;
}

const SessionContext = createContext<SessionContextType>({
  userInfo: null,
  deviceId: null,
  deviceValid: false,
  isChecking: true,
});

export const useSession = () => useContext(SessionContext);

interface Props {
  children: ReactNode;
}

export default function SessionChecker({ children }: Props) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceValid, setDeviceValid] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;

    const initSession = async () => {
      try {
        console.log("🔐 Checking user session and device...");

        const [session, deviceValidation] = await Promise.all([
          checkUserSession(),
          validateDeviceId(),
        ]);

        if (!isMounted) return;

        console.log("📊 Session & Device status:", {
          isAuthenticated: session.isAuthenticated,
          onboardingCompleted: session.onboardingCompleted,
          deviceValid: deviceValidation.isValid,
          isNewDevice: deviceValidation.isNewDevice,
        });

        if (session.isAuthenticated && !deviceValidation.isValid) {
          console.log("🚫 Device mismatch detected at app launch");
          await handleDeviceMismatch();

          Alert.alert(
            "Account Moved",
            "Your account is now active on another device. Please login again.",
            [
              {
                text: "OK",
                onPress: () => {
                  if (isMounted) setIsChecking(false);
                  router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
                },
              },
            ],
          );
          return;
        }

        if (!session.userInfo) {
          console.warn("⚠️ No user info available, redirecting to onboarding.");
          router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
          return;
        }

        setUserInfo(session.userInfo);
        setDeviceId(
          session.userInfo.currentDeviceId || session.userInfo.deviceId || null,
        );
        setDeviceValid(deviceValidation.isValid);

        if (
          session.isAuthenticated &&
          session.onboardingCompleted &&
          deviceValidation.isValid
        ) {
          console.log("✅ Session check successful");
          if (session.userInfo.userType === "driver") {
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

    initSession();

    return () => {
      isMounted = false;
    };
  }, []); // 👈 remove router dependency

  return (
    <SessionContext.Provider
      value={{ userInfo, deviceId, deviceValid, isChecking }}
    >
      {children}
    </SessionContext.Provider>
  );
}
