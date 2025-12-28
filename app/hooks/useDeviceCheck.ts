// hooks/useDeviceCheck.ts
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ROUTES } from "../../utils/routes";
import { handleDeviceMismatch, validateDeviceId } from '../../utils/storage';

export const useDeviceCheck = () => {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null; // ✅ FIXED: Use ReturnType

    const checkDevice = async () => {
      try {
        const deviceValidation = await validateDeviceId();
        if (!deviceValidation.isValid) {
          console.log('🚫 Background device check failed - logging out');
          await handleDeviceMismatch();
          // In useDeviceCheck.ts:
router.replace(ROUTES.ONBOARDING.GET_STARTED as never); // ✅ USE ROUTE CONSTANTS
        }
      } catch (error) {
        console.error('Background device check error:', error);
      }
    };

    // Check every 2 minutes when app is active
    intervalId = setInterval(checkDevice, 2 * 60 * 1000);

    // Also check when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('🔄 App came to foreground - checking device');
        checkDevice();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial check
    checkDevice();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      subscription.remove();
    };
  }, [router]);
};