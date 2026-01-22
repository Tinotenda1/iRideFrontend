// app\passenger\components\tabs\Tray.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import { useRideBooking } from '../../../../app/context/RideBookingContext';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import LocationInputTab from './LocationInputTab';
import RideTab from './RideTab';
import SearchingTab from './SearchingTab';

interface TrayProps {
  onTrayStateChange?: (open: boolean) => void;
  onTrayHeightChange?: (height: number) => void;
  onLocationInputFocus?: (field: 'pickup' | 'destination') => void;
  onOpenAdditionalInfo?: () => void;
  hasOffers?: boolean; // Received from PassengerScreen
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT_INPUT = windowHeight * 0.5;
const OPEN_HEIGHT_RIDE = windowHeight * 0.4;
const OPEN_HEIGHT_SEARCHING = windowHeight * 0.3; 
const CLOSED_HEIGHT = 140;

const Tray = forwardRef<any, TrayProps>(({
  onTrayStateChange,
  onTrayHeightChange,
  onLocationInputFocus,
  onOpenAdditionalInfo,
  hasOffers // Destructure hasOffers
}, ref) => {
  const { rideData, updateRideData } = useRideBooking();
  const [currentTab, setCurrentTab] = useState<'input' | 'ride' | 'searching'>('input');
  
  const heightAnim = useRef(new Animated.Value(0)).current; 
  const translateY = useRef(new Animated.Value(OPEN_HEIGHT_INPUT - CLOSED_HEIGHT)).current;
  const transitionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    handleTransition('input');
    openTray();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (currentTab === 'ride') {
        // Handle Ride Tab: Clear destination and go back to input
        updateRideData({ destination: null });
        handleTransition('input');
        return true;
      }
      
      // ⚠️ IMPORTANT CHANGE HERE:
      // We must return 'false' for searching. This tells React Native:
      // "Tray doesn't want to handle this, pass it to the next listener (SearchingTab)"
      // SearchingTab will then block it (if searching) or handle it (if no drivers).
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentTab, updateRideData]);

  useEffect(() => {
    if (rideData.pickupLocation && rideData.destination) {
      console.log('🔄 Locations detected, fetching prices...');
      fetchPricingSuggestions();
    }
  }, [rideData.pickupLocation, rideData.destination]);

  const fetchPricingSuggestions = async () => {
    if (!rideData.pickupLocation || !rideData.destination) return;
    try {
      const payload = {
        pickup: { latitude: rideData.pickupLocation.latitude, longitude: rideData.pickupLocation.longitude },
        destination: { latitude: rideData.destination.latitude, longitude: rideData.destination.longitude },
      };
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/pricing/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const prices: Record<string, number> = {};
      data.suggestions.forEach((item: any) => { prices[item.vehicleType] = item.suggestedPrice; });
      updateRideData({ vehiclePrices: prices });
    } catch (error) {
      console.error('❌ Error fetching pricing:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    openTray,
    closeTray,
    switchToRides: () => handleTransition('ride'),
    switchToInput: () => handleTransition('input'),
    switchToSearching: () => handleTransition('searching'),
  }));

  const handleTransition = (target: 'input' | 'ride' | 'searching') => {
    setCurrentTab(target);
    
    // NEW: If we are going back to the input screen, clear the old prices
    // so they don't "flicker" with old data when the user picks a new destination.
    if (target === 'input') {
      updateRideData({ vehiclePrices: {} });
    }
    
    let transitionValue = 0;
    let heightValue = 0; // 0 = Input, 1 = Ride, 2 = Searching

    if (target === 'input') {
      transitionValue = 0;
      heightValue = 0;
    } else if (target === 'ride') {
      transitionValue = 1;
      heightValue = 1;
    } else if (target === 'searching') {
      transitionValue = 2;
      heightValue = 2;
    }

    Animated.parallel([
      Animated.spring(transitionAnim, {
        toValue: transitionValue,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
      Animated.spring(heightAnim, {
        toValue: heightValue,
        useNativeDriver: false,
      })
    ]).start();
  };

  const openTray = () => {
    onTrayStateChange?.(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();

    // Report the correct height based on current tab
    const heights = {
      input: OPEN_HEIGHT_INPUT,
      ride: OPEN_HEIGHT_RIDE,
      searching: OPEN_HEIGHT_SEARCHING
    };
    onTrayHeightChange?.(heights[currentTab]);
  };

  const closeTray = () => {
    onTrayStateChange?.(false);
    const currentActiveHeight = currentTab === 'ride' ? OPEN_HEIGHT_RIDE : OPEN_HEIGHT_INPUT;
    Animated.spring(translateY, {
      toValue: currentActiveHeight - CLOSED_HEIGHT,
      useNativeDriver: false,
      tension: 50,
      friction: 9,
    }).start();
    onTrayHeightChange?.(CLOSED_HEIGHT);
  };

  const inputTranslateX = transitionAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -windowWidth, -windowWidth * 2],
  });

  const rideTranslateX = transitionAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [windowWidth, 0, -windowWidth],
  });

  const searchingTranslateX = transitionAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [windowWidth * 2, windowWidth, 0],
  });

  const currentTrayHeight = heightAnim.interpolate({
  inputRange: [0, 1, 2],
  outputRange: [OPEN_HEIGHT_INPUT, OPEN_HEIGHT_RIDE, OPEN_HEIGHT_SEARCHING],
});

  return (
    <Animated.View style={[styles.container, { height: currentTrayHeight, transform: [{ translateY }] }]}>
      <LinearGradient colors={['#FFFFFF', theme.colors.surface]} style={styles.background} />
      <View style={styles.contentContainer}>
        <View style={styles.tabsWrapper}>
          {/* Location Input Tab */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: inputTranslateX }] }]}>
            <LocationInputTab onFocus={(field) => { openTray(); onLocationInputFocus?.(field); }} />
          </Animated.View>
          
          {/* Ride Tab */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: rideTranslateX }] }]}>
            <RideTab 
              id="ride-options" 
              onOpenAdditionalInfo={onOpenAdditionalInfo || (() => {})} 
              onSwitchToSearching={() => handleTransition('searching')}
            />
          </Animated.View>

          {/* Searching Tab */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: searchingTranslateX }] }]}>
            <SearchingTab 
              // We use a logical AND: it's only active if the tray is on the searching tab 
              // AND the ride hasn't been matched yet.
              isActive={currentTab === 'searching' && rideData.status !== 'matched'}
              onCancel={() => {
                updateRideData({ destination: null });
                handleTransition('input'); 
              }}
              onBackToRide={() => {
                handleTransition('ride');
              }}
              hasOffers={!!hasOffers} 
            />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
});

Tray.displayName = 'Tray';

const styles = createStyles({
  container: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20,
  },
  background: { ...StyleSheet.absoluteFillObject, borderTopLeftRadius: theme.borderRadius.xl * 1.5, borderTopRightRadius: theme.borderRadius.xl * 1.5 },
  contentContainer: { flex: 1, paddingTop: theme.spacing.md },
  tabsWrapper: { flex: 1, overflow: 'hidden' },
});

export default Tray;