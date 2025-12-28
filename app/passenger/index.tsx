// app/passenger/index.tsx
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapContainer from '../../components/map/MapContainer';
import Sidebar from '../../components/Sidebar';
import NotificationsTab from '../../components/tabs/NotificationsTab';
import RewardsTab from '../../components/tabs/RewardsTab';
import RideTab from '../../components/tabs/RideTab';
import Tray from '../../components/tabs/Tray';
import WalletTab from '../../components/tabs/WalletTab';
import AdditionalInfoTray from '../../components/trays/AdditionalInfoTray';
import InputTray from '../../components/trays/InputTray';

const PassengerScreen: React.FC = () => {
  const trayRef = useRef<any>(null);
  const inputTrayRef = useRef<any>(null);
  const infoTrayRef = useRef<any>(null);   // ⭐ NEW
  const sidebarRef = useRef<any>(null);


  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const [activeInputField, setActiveInputField] =
    useState<'pickup' | 'destination'>('pickup');

  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
  setTimeout(() => {
      trayRef.current?.openTrayFromOutside('ride');
    }, 200); // small delay to ensure layout is ready
  }, []);


  // -------------------------
  // Handle tray height changes
  // -------------------------
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
  }, []);

  // -------------------------
  // INPUT TRAY OPEN (Pickup/Destination)
  // -------------------------
  const handleLocationInputFocus = useCallback(
    (field: 'pickup' | 'destination') => {
      setActiveInputField(field);
      inputTrayRef.current?.open();
    },
    []
  );

  // -------------------------
  // INFO TRAY OPEN
  // Called from inside RideTab (More Info button)
  // -------------------------
  const openInfoTray = useCallback(() => {
    infoTrayRef.current?.open();   // ⭐ Same method as input tray
  }, []);

    return (
    <View style={styles.container}>
      {/* MAP + MENU BUTTON + OTHER CONTENT */}
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
        <RideTab id="ride" onOpenAdditionalInfo={openInfoTray} /> 
        <WalletTab id="wallet" />
        <RewardsTab id="rewards" />
        <NotificationsTab id="notifications" />
      </Tray>

      {/* INPUT TRAY */}
      <InputTray ref={inputTrayRef} activeField={activeInputField} onClose={() => {}} />

      {/* ADDITIONAL INFO TRAY */}
     <AdditionalInfoTray
        ref={infoTrayRef}
        onClose={() => {}}
      />


      {/* 🔥 SIDEBAR LAST TO ENSURE TOP LAYER */}
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
    zIndex: 99999,  // still below sidebar
  },

  // Sidebar overlay handled inside Sidebar.tsx:
  // Make sure it uses:
  // zIndex: 1000000
  // elevation: 1000000
  // pointerEvents: isOpen ? 'auto' : 'none'
});

