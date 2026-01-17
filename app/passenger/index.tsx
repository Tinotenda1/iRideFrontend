// app/passenger/index.tsx
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import MapContainer from './components/map/MapContainer';
import Sidebar from './components/passengerSidebar';
import Tray from './components/tabs/Tray';
import AdditionalInfoTray from './components/trays/AdditionalInfoTray';
import InputTray from './components/trays/InputTray';

// 🔌 Passenger Socket Service
import {
  connectPassenger,
  disconnectPassenger,
} from './socketConnectionUtility/passengerSocketService';

const PassengerScreen: React.FC = () => {
  const trayRef = useRef<any>(null);
  const inputTrayRef = useRef<any>(null);
  const infoTrayRef = useRef<any>(null);
  const sidebarRef = useRef<any>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const [activeInputField, setActiveInputField] =
    useState<'pickup' | 'destination'>('pickup');

  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;

  /* -------------------------------------------------
   * AUTO-CONNECT PASSENGER SOCKET + APP STATE CONTROL
   * ------------------------------------------------- */
  useEffect(() => {
    // 🔌 Connect passenger socket on app open
    connectPassenger();

    const subscription = AppState.addEventListener('change', nextState => {
      const prevState = appState.current;
      appState.current = nextState;

      // ⏸️ App goes background
      if (
        prevState === 'active' &&
        (nextState === 'inactive' || nextState === 'background')
      ) {
        console.log('📴 Passenger app backgrounded → disconnect socket');
        disconnectPassenger();
      }

      // 🔄 App comes foreground
      if (
        (prevState === 'inactive' || prevState === 'background') &&
        nextState === 'active'
      ) {
        console.log('📡 Passenger app foregrounded → reconnect socket');
        connectPassenger();
      }
    });

    return () => {
      subscription.remove();
      disconnectPassenger();
    };
  }, []);

  /* -------------------------------------------------
   * OPEN DEFAULT TRAY ON LOAD
   * ------------------------------------------------- */
  useEffect(() => {
    setTimeout(() => {
      trayRef.current?.openTray();
    }, 200);
  }, []);

  /* -------------------------------------------------
   * TRAY HEIGHT HANDLING
   * ------------------------------------------------- */
  const handleTrayHeightChange = useCallback(
    (height: number) => {
      setTrayHeight(height);

      const closedTrayHeight = 80;
      const bottomPosition = isTrayOpen ? height + 10 : closedTrayHeight + 10;

      Animated.spring(searchCardBottomAnim, {
        toValue: bottomPosition,
        tension: 50,
        friction: 10,
        useNativeDriver: false,
      }).start();
    },
    [isTrayOpen, searchCardBottomAnim]
  );

  const handleTrayStateChange = useCallback((open: boolean) => {
    setIsTrayOpen(open);
  }, []);

  useEffect(() => {
    const initialClosedTrayHeight = 80;
    searchCardBottomAnim.setValue(initialClosedTrayHeight + 10);
  }, [searchCardBottomAnim]);

  /* -------------------------------------------------
   * LOCATION INPUT (PICKUP / DESTINATION)
   * ------------------------------------------------- */
  const handleLocationInputFocus = useCallback(
    (field: 'pickup' | 'destination') => {
      setActiveInputField(field);
      inputTrayRef.current?.open();
    },
    []
  );

  /* -------------------------------------------------
   * ADDITIONAL INFO TRAY
   * ------------------------------------------------- */
  const openInfoTray = useCallback(() => {
    infoTrayRef.current?.open();
  }, []);

  return (
    <View style={styles.container}>
      {/* MAP + MENU */}
      <View style={styles.contentArea}>
        <MapContainer trayHeight={trayHeight} />

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => sidebarRef.current?.open()}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={28} color="#00000096" />
        </TouchableOpacity>
      </View>

      {/* MAIN TRAY */}
      <Tray
        ref={trayRef}
        onTrayHeightChange={handleTrayHeightChange}
        onTrayStateChange={handleTrayStateChange}
        onLocationInputFocus={handleLocationInputFocus}
        onOpenAdditionalInfo={openInfoTray}
      >
      </Tray>

      {/* INPUT TRAY */}
      <InputTray
        ref={inputTrayRef}
        activeField={activeInputField}
        onClose={() => {}}
      />

      {/* ADDITIONAL INFO TRAY */}
      <AdditionalInfoTray ref={infoTrayRef} onClose={() => {}} />

      {/* SIDEBAR */}
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
    backgroundColor: 'rgba(255, 255, 255, 1)',
    padding: 8,
    borderRadius: theme.borderRadius.full,
    zIndex: 99999,
  },
});
