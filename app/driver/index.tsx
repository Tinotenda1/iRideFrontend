// app/driver/index.tsx
import { theme } from '@/constants/theme';
import { getUserInfo } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import DriverFooterNav from './components/DriverFooterNav';
import DriverHeader from './components/DriverHeader';
import Sidebar from './components/DriverSideBar';
import DriverSettingsTray from './components/trays/DriverSettingsTray';
import RideRequestTray from './components/trays/RideRequestTray';

import DriverHome from './screens/DriverHome';
import DriverIWallet from './screens/DriverIWallet';
import DriverNotifications from './screens/DriverNotifications';
import DriverRevenue from './screens/DriverRevenue';

/* ---------------------------------------------
 * Socket service
 * ------------------------------------------- */
import { getDriverSocket, getDriverSocketStatus, isDriverOnline } from './socketConnectionUtility/driverSocketService';

type Screen = 'home' | 'wallet' | 'revenue' | 'notifications';

const DriverDashboard: React.FC = () => {
  const router = useRouter();

  /* ---------------------------------------------
   * UI refs
   * ------------------------------------------- */
  const sidebarRef = useRef<any>(null);
  const settingsTrayRef = useRef<any>(null);
  const rideTrayRef = useRef<any>(null);

  /* ---------------------------------------------
   * State
   * ------------------------------------------- */
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [incomingRides, setIncomingRides] = useState<any[]>([]); // allow multiple rides

  /* ---------------------------------------------
   * Socket-derived UI state
   * ------------------------------------------- */
  const [online, setOnline] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  /* ---------------------------------------------
   * Load driver info
   * ------------------------------------------- */
  useEffect(() => {
    const loadDriver = async () => {
      try {
        const user = await getUserInfo();

        if (!user) {
          Alert.alert('Session expired', 'Please login again');
          router.replace('/auth/login' as any);
          return;
        }

        setDriverInfo(user);
      } catch (err) {
        console.error('❌ Failed to load driver info:', err);
        Alert.alert('Error', 'Unable to load driver information');
      } finally {
        setLoading(false);
      }
    };

    loadDriver();
  }, [router]);

  /* ---------------------------------------------
   * Observe socket status
   * ------------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      const status = getDriverSocketStatus();
      setOnline(isDriverOnline());
      setIsConnecting(status === 'connecting' || status === 'reconnecting');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /* ---------------------------------------------
   * Socket event handlers
   * ------------------------------------------- */
  useEffect(() => {
    const socket = getDriverSocket();
    if (!socket) {
      console.log("[Dashboard] Socket not ready");
      return;
    }

    console.log("[Dashboard] Attaching 'ride:new_request' listener");

    const handleRideRequest = (rideData: any) => {
      console.log('🚨 [SOCKET EVENT] ride:new_request received:', rideData);
      if (rideData) {
        setIncomingRides((prev) => [...prev, rideData]);
        //rideTrayRef.current?.open(rideData);
      }
    };

    socket.on('ride:new_request', handleRideRequest);

    return () => {
      console.log("[Dashboard] Removing 'ride:new_request' listener");
      socket.off('ride:new_request', handleRideRequest);
    };
  }, [online, driverInfo]);

  /* ---------------------------------------------
   * Ride request handlers
   * ------------------------------------------- */
  const handleAccept = (ride: any) => {
    console.log('Ride accepted:', ride);
    setIncomingRides((prev) => prev.filter(r => r.rideId !== ride.rideId));
  };

  const handleDecline = (ride: any) => {
    console.log('Ride declined:', ride);
    setIncomingRides((prev) => prev.filter(r => r.rideId !== ride.rideId));
  };

  const handleSelect = (ride: any) => {
    console.log('Ride selected:', ride);
    rideTrayRef.current?.open(ride);
  };

  /* ---------------------------------------------
   * Screen renderer
   * ------------------------------------------- */
  const renderScreen = () => {
    switch (activeScreen) {
      case 'wallet':
        return <DriverIWallet title="DriverIWallet" />;

      case 'revenue':
        return <DriverRevenue title="DriverRevenue" />;

      case 'notifications':
        return <DriverNotifications title="DriverNotifications" />;

      case 'home':
      default:
        return (
          <DriverHome
            online={online}
            isConnecting={isConnecting}
            incomingRides={incomingRides}
            onRideAccept={handleAccept}
            onRideDecline={handleDecline}
            onRideSelect={handleSelect}
          />
        );
    }
  };

  /* ---------------------------------------------
   * Loading state
   * ------------------------------------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.subText}>Loading driver...</Text>
      </View>
    );
  }

  if (!driverInfo) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Driver not found. Please login again.
        </Text>
      </View>
    );
  }

  /* ---------------------------------------------
   * Dashboard layout
   * ------------------------------------------- */
  return (
    <View style={styles.container}>
      <Sidebar ref={sidebarRef} userType="driver" />

      <DriverHeader
        onMenuPress={() => sidebarRef.current?.open()}
        onOpenSettings={() => settingsTrayRef.current?.open()}
        setOnline={setOnline}
        setIsConnecting={setIsConnecting}
      />

      <View style={styles.content}>{renderScreen()}</View>

      <DriverSettingsTray ref={settingsTrayRef} onClose={() => {}} />

      <RideRequestTray
        ref={rideTrayRef}
        driverId={driverInfo.id}
        onClose={() => {}}
      />

      <DriverFooterNav active={activeScreen} onChange={setActiveScreen} />
    </View>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  subText: {
    marginTop: 12,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
