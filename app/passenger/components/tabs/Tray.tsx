// components/tabs/Tray.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  View
} from 'react-native';
import { useRideBooking } from '../../../../app/context/RideBookingContext';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import LocationInputCard from '../map/LocationInputCard';
import { Place } from '../map/LocationSearch';
import RideTab from './RideTab';

interface TrayProps {
  onTrayStateChange?: (open: boolean) => void;
  onTrayHeightChange?: (height: number) => void;
  onLocationInputFocus?: (field: 'pickup' | 'destination') => void;
  onOpenAdditionalInfo?: () => void; 
}

// Constants
const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.5; // 50% of screen height when fully open

const Tray = forwardRef<any, TrayProps>(({
  onTrayStateChange,
  onTrayHeightChange,
  onLocationInputFocus,
  onOpenAdditionalInfo
}, ref) => {
  const { rideData, updateRideData } = useRideBooking();

  const [trayOpen, setTrayOpen] = useState(false);
  const [dynamicHeight, setDynamicHeight] = useState(OPEN_HEIGHT);
  const [headerHeight, setHeaderHeight] = useState(0);

  const translateY = useRef(new Animated.Value(OPEN_HEIGHT)).current;
  const headerRef = useRef<View>(null);

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.measure((x, y, width, height) => {
        setHeaderHeight(height || 0);
      });
    }
  }, [trayOpen]);

  // Expose functions to open/close tray
  useImperativeHandle(ref, () => ({
    openTray: () => openTray(),
    closeTray: () => closeTray(),
  }));

  const openTray = () => {
    setTrayOpen(true);
    onTrayStateChange?.(true);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    setDynamicHeight(OPEN_HEIGHT);
    onTrayHeightChange?.(OPEN_HEIGHT);
  };

  const closeTray = () => {
    setTrayOpen(false);
    onTrayStateChange?.(false);

    Animated.spring(translateY, {
      toValue: OPEN_HEIGHT,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    setDynamicHeight(OPEN_HEIGHT);
    onTrayHeightChange?.(OPEN_HEIGHT);
  };

  const handlePickupChange = useCallback((text: string) => {
    updateRideData({
      pickupLocation: rideData.pickupLocation
        ? { ...rideData.pickupLocation, name: text }
        : { id: 'temp-pickup', name: text, address: '', latitude: 0, longitude: 0 }
    });
  }, [rideData.pickupLocation, updateRideData]);

  const handleDestinationChange = useCallback((text: string) => {
    updateRideData({
      destination: rideData.destination
        ? { ...rideData.destination, name: text }
        : { id: 'temp-destination', name: text, address: '', latitude: 0, longitude: 0 }
    });
  }, [rideData.destination, updateRideData]);

  const handlePickupSelect = useCallback((place: Place | null) => {
    updateRideData({ pickupLocation: place });
  }, [updateRideData]);

  const handleDestinationSelect = (place: Place | null) => {
    updateRideData({ destination: place });

    if (place) {
      Keyboard.dismiss();
      setTimeout(openTray, 120); // open fully when destination is selected
    }
  };

  const handleLocationInputFocus = (field: 'pickup' | 'destination') => {
    onLocationInputFocus?.(field);
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], height: dynamicHeight }]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', theme.colors.surface]}
        locations={[0, 0.5]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={[styles.gradientBackground, { height: dynamicHeight }]}
      />

      <View style={styles.contentContainer}>
        <View ref={headerRef} style={styles.locationInputContainer}>
          <LocationInputCard
            pickup={rideData.pickupLocation?.name || ''}
            destination={rideData.destination?.name || ''}
            onPickupChange={handlePickupChange}
            onDestinationChange={handleDestinationChange}
            onPickupSelect={handlePickupSelect}
            onDestinationSelect={handleDestinationSelect}
            onInputFocus={handleLocationInputFocus}
          />
        </View>

        {/* Ride tab content below LocationInputCard */}
        {trayOpen && (
          <View style={[styles.rideTabContainer, { marginTop: headerHeight + theme.spacing.sm }]}>
            <RideTab id="ride" onOpenAdditionalInfo={onOpenAdditionalInfo!} />
          </View>
        )}
      </View>
    </Animated.View>
  );
});

Tray.displayName = 'Tray';

const styles = createStyles({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    zIndex: 20,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.md,
  },
  locationInputContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  rideTabContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: theme.spacing.md,
  },
});

export default Tray;
