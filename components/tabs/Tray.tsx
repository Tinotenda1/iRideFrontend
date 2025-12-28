// components/tabs/Tray.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRideBooking } from '../../app/context/RideBookingContext';
import { theme } from '../../constants/theme';
import { createStyles, typedTypography } from '../../utils/styles';
import LocationInputCard from '../map/LocationInputCard';
import { Place } from '../map/LocationSearch';

// Import individual tab components
import NotificationsTab from './NotificationsTab';
import RewardsTab from './RewardsTab';
import RideTab from './RideTab';
import WalletTab from './WalletTab';

interface TrayProps {
  children?: React.ReactNode;
  onTrayStateChange?: (open: boolean) => void;
  onTrayHeightChange?: (height: number) => void;
  onLocationInputFocus?: (field: 'pickup' | 'destination') => void;
  onOpenAdditionalInfo?: () => void; 
}

// Constants
const { height: windowHeight } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;

const OPEN_HEIGHT = windowHeight * 0.5;

const Tray = forwardRef<any, TrayProps>(({ 
  onTrayStateChange, 
  onTrayHeightChange,
  onLocationInputFocus, 
  onOpenAdditionalInfo
}, ref) => {
  const { rideData, updateRideData } = useRideBooking();
  
  const [trayOpen, setTrayOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ride' | 'wallet' | 'rewards' | 'notifications'>('ride');
  const [dynamicOpenHeight, setDynamicOpenHeight] = useState(OPEN_HEIGHT);
  const [headerHeight, setHeaderHeight] = useState(0);

  const translateY = useRef(new Animated.Value(OPEN_HEIGHT)).current;
  const scrollRef = useRef<ScrollView>(null);
  const headerRef = useRef<View>(null);

  const tabs = [
    { id: 'ride', icon: 'car', label: 'Ride' },
    { id: 'wallet', icon: 'wallet', label: 'iWallet' },
    { id: 'rewards', icon: 'gift', label: 'Rewards' },
    { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  ];

  // Measure header height
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.measure((x, y, width, height) => {
        setHeaderHeight(height || 0);
      });
    }
  }, [trayOpen]);

  // Expose tray functions
  useImperativeHandle(ref, () => ({
    openTrayFromOutside: (tabId?: 'ride' | 'wallet' | 'rewards' | 'notifications') => {
      if (tabId) setActiveTab(tabId);
      openTray();
    },
    closeTrayFromOutside: () => closeTray(),
  }));

  const scrollToTopWithDelay = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const openTray = () => {
    setTrayOpen(true);
    onTrayStateChange?.(true);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    onTrayHeightChange?.(dynamicOpenHeight);
  };

  const closeTray = () => {
    setTrayOpen(false);
    onTrayStateChange?.(false);

    Animated.spring(translateY, {
      toValue: dynamicOpenHeight,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();

    onTrayHeightChange?.(0);
  };

  const handleTabPress = (tabId: 'ride' | 'wallet' | 'rewards' | 'notifications') => {
    setActiveTab(tabId);
    openTray();
    scrollToTopWithDelay();
  };

  const handlePickupChange = useCallback((text: string) => {
    updateRideData({ 
      pickupLocation: rideData.pickupLocation ? 
        { ...rideData.pickupLocation, name: text } : 
        { id: 'temp-pickup', name: text, address: '', latitude: 0, longitude: 0 }
    });
  }, [rideData.pickupLocation, updateRideData]);

  const handleDestinationChange = useCallback((text: string) => {
    updateRideData({ 
      destination: rideData.destination ? 
        { ...rideData.destination, name: text } : 
        { id: 'temp-destination', name: text, address: '', latitude: 0, longitude: 0 }
    });
  }, [rideData.destination, updateRideData]);

  const handlePickupSelect = useCallback((place: Place | null) => {
    updateRideData({ pickupLocation: place });
  }, [updateRideData]);

  const handleDestinationSelect = useCallback((place: Place | null) => {
    updateRideData({ destination: place });
  }, [updateRideData]);

  const handleLocationInputFocus = (field: 'pickup' | 'destination') => {
    setActiveTab('ride');
    openTray();
    onLocationInputFocus?.(field);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ride':
        return <RideTab id="ride" onOpenAdditionalInfo={onOpenAdditionalInfo!} />;
      case 'wallet':
        return <WalletTab id="wallet" />;
      case 'rewards':
        return <RewardsTab id="rewards" />;
      case 'notifications':
        return <NotificationsTab id="notifications" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Animated.View
        style={[styles.container, { transform: [{ translateY }], height: dynamicOpenHeight }]}
      >
        {trayOpen && (
          <LinearGradient
            colors={['rgba(255,255,255,0)', theme.colors.surface]}
            locations={[0, 0.5]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={[styles.gradientBackground, { height: dynamicOpenHeight, opacity: 1 }]}
          />
        )}

        {trayOpen && (
          <View style={styles.contentContainer}>
            <View ref={headerRef} style={styles.locationInputContainer}>
              <LocationInputCard
                pickup={rideData.pickupLocation?.name || ''}
                destination={rideData.destination?.name || ''}
                onPickupChange={handlePickupChange}
                onDestinationChange={handleDestinationChange}
                onPickupSelect={handlePickupSelect}
                onDestinationSelect={handleDestinationSelect}
                onInputFocus={(field) => handleLocationInputFocus(field)}
              />
            </View>

            {activeTab === 'ride' ? (
              // 🚘 FIXED Ride Tab (no scroll, locks inside tray)
              <View
                style={[
                  styles.fixedRideTabContainer,
                  { marginTop: headerHeight + theme.spacing.sm }
                ]}
              >
                {renderActiveTab()}
              </View>
            ) : (
              // 📜 Scrollable tabs for others
              <ScrollView
                ref={scrollRef}
                style={[
                  styles.scrollArea,
                  { marginTop: headerHeight + theme.spacing.sm }
                ]}
                contentContainerStyle={styles.scrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {renderActiveTab()}
              </ScrollView>
            )}

          </View>
        )}
      </Animated.View>

      <SafeAreaView edges={['bottom']} style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => handleTabPress(tab.id as any)}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </SafeAreaView>
    </>
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
  draggableArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 30,
  },
  trayHandle: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
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
  fixedRideTabContainer: {
  flex: 0,
  height: 'auto',
  backgroundColor: 'transparent',
  paddingBottom: theme.spacing.md,
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
    //paddingBottom: theme.spacing.sm,
  },
  scrollArea: { 
    flex: 1,
    backgroundColor: 'transparent',
    marginBottom: TAB_BAR_HEIGHT,
  },
  scrollContent: { 
    paddingHorizontal: theme.spacing.sm, 
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  tabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.sm,
    zIndex: 8000,
    elevation: 50,
  },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: theme.spacing.sm 
  },
  activeTab: {},
  tabIconContainer: { 
    marginBottom: theme.spacing.xs 
  },
  tabLabel: { 
    ...typedTypography.caption, 
    color: theme.colors.textSecondary, 
    fontSize: 12, 
    fontWeight: '500' 
  },
  activeTabLabel: { 
    color: theme.colors.primary, 
    fontWeight: '600' 
  },
});

export default Tray;
