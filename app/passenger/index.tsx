// app/passenger/index.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { useRideBooking } from '../context/RideBookingContext';
import { DriverOfferCard } from './components/DriverOfferCard';
import MapContainer from './components/map/MapContainer';
import Sidebar from './components/passengerSidebar';
import Tray from './components/tabs/Tray';
import AdditionalInfoTray from './components/trays/AdditionalInfoTray';
import InputTray from './components/trays/InputTray';
import TripLocationCard from './components/TripLocationCard';

import {
  connectPassenger,
  disconnectPassenger,
  getPassengerSocket,
} from './socketConnectionUtility/passengerSocketService';

const PassengerScreen: React.FC = () => {
  const trayRef = useRef<any>(null);
  const inputTrayRef = useRef<any>(null);
  const infoTrayRef = useRef<any>(null);
  const sidebarRef = useRef<any>(null);

  const RIDE_DELAY = Number(process.env.ride_Tab_And_Trip_Location_Card_Delay || 600);

  const { rideData, updateRideData } = useRideBooking();
  const socket = getPassengerSocket();

  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [activeInputField, setActiveInputField] = useState<'pickup' | 'destination'>('pickup');

  const [submissionStates, setSubmissionStates] = useState<Record<string, 'idle' | 'submitting' | 'accepted'>>({});
  
  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(1)).current;

  /* -------------------------------------------------
   * 1. REMOVE OFFER HELPER
   * ------------------------------------------------- */
  const removeOffer = useCallback((driverPhone: string) => {
    setOffers((prev) => prev.filter(o => o.driver.phone !== driverPhone));
    setSubmissionStates(prev => {
      const newState = { ...prev };
      delete newState[driverPhone];
      return newState;
    });
  }, []);

  /* -------------------------------------------------
   * 2. ACCEPT OFFER (Driver Selection)
   * ------------------------------------------------- */
  const handleAcceptOffer = useCallback(async (offer: any) => {
    const targetRideId = offer.rideId; 
    const targetDriverPhone = offer.driver.phone;
    
    setSubmissionStates(prev => ({ ...prev, [targetDriverPhone]: 'submitting' }));

    try {
      // Logic from backend modules/driverSelection.js
      socket?.emit('passenger:select_driver', {
        rideId: targetRideId,
        driverPhone: targetDriverPhone
      });
      // We don't set 'accepted' here immediately anymore; 
      // we wait for the 'ride:matched' socket event.
    } catch (err) {
      console.error("Acceptance error:", err);
      setSubmissionStates(prev => ({ ...prev, [targetDriverPhone]: 'idle' }));
    }
  }, [socket]);

  /* -------------------------------------------------
   * 3. DECLINE OFFER
   * ------------------------------------------------- */
  const handleDeclineOffer = useCallback((offer: any) => {
    const targetRideId = offer.rideId;
    const targetDriverPhone = offer.driver.phone;

    // Logic from backend modules/handleDriverDecline.js
    socket?.emit('passenger:decline_driver', {
      rideId: targetRideId,
      driverPhone: targetDriverPhone
    });

    removeOffer(targetDriverPhone);
  }, [socket, removeOffer]);

  /* -------------------------------------------------
   * 4. SOCKET & NORMALIZATION
   * ------------------------------------------------- */
  useEffect(() => {
    connectPassenger();

    const subscription = AppState.addEventListener('change', nextState => {
      if (appState.current === 'active' && (nextState === 'inactive' || nextState === 'background')) {
        disconnectPassenger();
      }
      if ((appState.current === 'inactive' || appState.current === 'background') && nextState === 'active') {
        connectPassenger();
      }
      appState.current = nextState;
    });

    if (socket) {
      socket.on('ride:driver_response', (newOffer) => {
        const driverPhone = newOffer.driver?.phone;
        if (!driverPhone || !newOffer.rideId) return;

        const expiresIn = newOffer.expiresIn || 30000;
        const expiresAt = Date.now() + expiresIn;

        setOffers((prev) => {
          const filtered = prev.filter(o => o.driver.phone !== driverPhone);
          return [{ ...newOffer, expiresAt, expiresIn }, ...filtered];
        });

        setSubmissionStates(prev => ({ ...prev, [driverPhone]: 'idle' }));
      });

      // Inside useEffect in PassengerScreen (app/passenger/index.tsx)
      socket.on('ride:matched', (data) => {
        console.log("✅ Match Confirmed. Cleaning up...");

        // 1. Clear the local UI offers list (kills DriverOfferCard timers)
        setOffers([]);

        // 2. Clear the button processing states
        setSubmissionStates({});

        // 3. Set status to 'matched' (kills SearchingTab timer via its isActive prop)
        updateRideData({ 
          status: 'matched',
          activeTrip: data.tripDetails 
        });

        // 4. Alert the user (or navigate)
        Alert.alert("Matched!", `Driver ${data.tripDetails.driver.name} is on the way!`);
        
       // TODO: Navigate to the trip screen
      });

      // Handle match failure (e.g., driver busy, already matched)
      socket.on('ride:match_failed', ({ reason }) => {
        console.warn("❌ Match Failed:", reason);
        setSubmissionStates({}); // Reset buttons
        
        if (reason === 'response_expired') {
          // You might want to refresh the list or alert the user
          Alert.alert("Offer Expired", "This driver's offer is no longer available.");
        }
      });

      socket.on('driver_unavailable', ({ driverPhone }) => {
        removeOffer(driverPhone);
        });
      }

    return () => {
      subscription.remove();
      disconnectPassenger();
      if (socket) {
        socket.off('ride:driver_response');
        socket.off('ride:matched');
        socket.off('ride:match_failed');
        socket.off('driver_unavailable');
      }
    };
  }, [socket, removeOffer]);

  /* -------------------------------------------------
   * 5. UI ANIMATIONS
   * ------------------------------------------------- */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (rideData.destination) {
      timeout = setTimeout(() => {
        Animated.timing(menuOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        trayRef.current?.switchToRides();
      }, RIDE_DELAY);
    } else {
      Animated.timing(menuOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      trayRef.current?.switchToInput();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [rideData.destination, RIDE_DELAY, menuOpacity]);

  const handleTrayHeightChange = useCallback((height: number) => {
    setTrayHeight(height);
    const bottomPosition = isTrayOpen ? height + 10 : 90;
    Animated.spring(searchCardBottomAnim, { toValue: bottomPosition, useNativeDriver: false }).start();
  }, [isTrayOpen, searchCardBottomAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <MapContainer trayHeight={trayHeight} />
        <Animated.View 
          style={[styles.menuButton, { opacity: menuOpacity }]}
          pointerEvents={rideData.destination ? 'none' : 'auto'}
        >
          <TouchableOpacity onPress={() => sidebarRef.current?.open()} activeOpacity={0.7}>
            <Ionicons name="menu" size={28} color="#00000096" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Tray
        ref={trayRef}
        onTrayHeightChange={handleTrayHeightChange}
        onTrayStateChange={setIsTrayOpen}
        onLocationInputFocus={(field) => {
          setActiveInputField(field);
          inputTrayRef.current?.open();
        }}
        onOpenAdditionalInfo={() => infoTrayRef.current?.open()}
        hasOffers={offers.length > 0} 
      />

      {offers.length > 0 && (
        <View style={styles.offersOverlay}>
          <FlatList
            data={offers}
            keyExtractor={(item) => item.driver.phone}
            renderItem={({ item }) => (
              <DriverOfferCard 
                offer={item} 
                status={submissionStates[item.driver.phone] || 'idle'}
                onAccept={handleAcceptOffer}
                onDecline={() => handleDeclineOffer(item) }
                onExpire={() => removeOffer(item.driver.phone)}
              />
            )}
            contentContainerStyle={styles.offersListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <TripLocationCard onPress={() => trayRef.current?.switchToInput()} />

      <InputTray ref={inputTrayRef} activeField={activeInputField} onClose={() => {}} />
      <AdditionalInfoTray ref={infoTrayRef} onClose={() => {}} />
      <Sidebar ref={sidebarRef} userType="passenger" />
    </View>
  );
};

export default PassengerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  contentArea: { flex: 1, backgroundColor: '#f5f5f5', overflow: 'hidden' },
  menuButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 50,
    zIndex: 100,
  },
  offersOverlay: {
    position: 'absolute',
    top: 125, 
    bottom: 0, 
    width: '100%',
    zIndex: 5, 
    paddingHorizontal: 16,
  },
  offersListContent: { 
    paddingTop: 10,
    paddingBottom: 250, 
  },
});