// app/driver/index.tsx
import { theme } from '@/constants/theme';
import { getUserInfo } from '@/utils/storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View
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

import {
  disconnectDriver,
  getDriverSocket,
  getDriverSocketStatus,
  handleDriverResponse,
  isDriverOnline
} from './socketConnectionUtility/driverSocketService';

type Screen = 'home' | 'wallet' | 'revenue' | 'notifications';
export type SubmissionState = 'idle' | 'submitting' | 'submitted';

const DriverDashboard: React.FC = () => {
  const router = useRouter();
  const sidebarRef = useRef<any>(null);
  const settingsTrayRef = useRef<any>(null);
  const rideTrayRef = useRef<any>(null);

  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [online, setOnline] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Stores the state of every unique ride ID
  const [submissionStates, setSubmissionStates] = useState<Record<string, SubmissionState>>({});
  const [submittedOffers, setSubmittedOffers] = useState<Record<string, number>>({});
 
  useEffect(() => {
    const loadDriver = async () => {
      try {
        const user = await getUserInfo();
        if (!user) {
          router.replace('/auth/login' as any);
          return;
        }
        setDriverInfo(user);
      } catch (err) {
        console.error('❌ Failed to load driver info:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDriver();
  }, [router]);

  useEffect(() => {
    return () => disconnectDriver();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const status = getDriverSocketStatus();
      setOnline(isDriverOnline());
      setIsConnecting(status === 'connecting' || status === 'reconnecting');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Inside DriverDashboard (app/driver/index.tsx)

  useEffect(() => {
    if (!online) return;
    const socket = getDriverSocket();
    if (!socket) return;

    const handleRideRequest = (rideData: any) => {
      const validRideId = rideData.rideId || rideData.id || rideData._id || `temp_${Date.now()}`;
      setIncomingRides(prev => [
        ...prev, 
        { ...rideData, rideId: validRideId, status: 'pending' }
      ]);
    };

    // NEW: Listener for when THIS driver is successfully matched
    const handleMatchConfirmed = (data: any) => {
      console.log("✅ Match Confirmed! Clearing all other requests from UI.");
      
      // 1. Clear the list of other incoming requests
      setIncomingRides([]); 
      
      // 2. Clear internal submission/loading states
      setSubmissionStates({});
      setSubmittedOffers({});

      // 3. Close the request tray if it's open
      rideTrayRef.current?.close();

      // 4. Set local online status to false to prevent UI from showing "Available"
      setOnline(false);
    };

    socket.on('ride:new_request', handleRideRequest);
    socket.on('ride:matched', handleMatchConfirmed); // Listen for match

    return () => {
      socket.off('ride:new_request', handleRideRequest);
      socket.off('ride:matched', handleMatchConfirmed);
    };
  }, [online]);

  const handleDecline = (ride: any) => {
    setIncomingRides(prev =>
      prev.filter(r => r.rideId !== ride.rideId)
    );
  };

  // Centralized submission handler
  const handleOfferSubmission = async (rideId: string, offer: number, baseOffer: number) => {
    if (!rideId) {
      console.error("❌ Error: Attempted to submit offer with missing rideId");
      return;
    }

    // 1. Set to submitting
    setSubmissionStates(prev => ({ ...prev, [rideId]: 'submitting' }));

    try {
      const responseType = offer === baseOffer ? 'accept' : 'counter';
      
      // Execute socket call
      await handleDriverResponse(rideId, driverInfo?.phone, offer, responseType);

      // 2. Success: Update both states
      setSubmittedOffers(prev => ({ ...prev, [rideId]: offer }));
      setSubmissionStates(prev => ({ ...prev, [rideId]: 'submitted' }));
      
      // Update the ride list status for the Home screen UI
      setIncomingRides(prev =>
        prev.map(r => r.rideId === rideId ? { ...r, status: 'submitted' } : r)
      );
    } catch (error) {
      console.error('Submission failed:', error);
      // Revert to idle on failure so they can try again
      setSubmissionStates(prev => ({ ...prev, [rideId]: 'idle' }));
    }
  };

  const handleSelect = (rideId: string, progress: number, msLeft: number, rideData: any) => {
    console.log(`👀 Opening Ride: ${rideId} | Status: ${submissionStates[rideId] ?? 'idle'}`);
    
    rideTrayRef.current?.open(
      rideId,
      progress,
      msLeft,
      submittedOffers[rideId] ?? null, // existingOffer
      submissionStates[rideId] ?? 'idle', // status
      rideData
    );
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'wallet': return <DriverIWallet title="DriverIWallet" />;
      case 'revenue': return <DriverRevenue title="DriverRevenue" />;
      case 'notifications': return <DriverNotifications title="DriverNotifications" />;
      case 'home':
      default:
        return (
          <DriverHome
            online={online}
            isConnecting={isConnecting}
            incomingRides={incomingRides}
            submittedOffers={submittedOffers}
            onRideSelect={handleSelect}
            onRideExpire={handleDecline}
          />
        );
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

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
        driverId={driverInfo?.id}
        // Pass the function that handles the logic
        onOfferSubmitted={handleOfferSubmission} 
        onClose={() => {}}
      />
      <DriverFooterNav active={activeScreen} onChange={setActiveScreen} />
    </View>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, backgroundColor: theme.colors.background || '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});