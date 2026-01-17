// components/trays/InputTray.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { BackHandler, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRideBooking } from '../../../../app/context/RideBookingContext';
import { theme } from '../../../../constants/theme';
import LocationSearch, { Place } from '../map/LocationSearch';

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9; // 90% open

interface InputTrayProps {
  activeField: 'pickup' | 'destination';
  onClose?: () => void;
}

const InputTray = forwardRef<any, InputTrayProps>(({ activeField, onClose }, ref) => {
  const { rideData, updateRideData } = useRideBooking();
  const [isOpen, setIsOpen] = useState(false);

  // Input text
  const [inputText, setInputText] = useState(
    activeField === 'pickup'
      ? rideData.pickupLocation?.name || ''
      : rideData.destination?.name || ''
  );

  // Handle Android back button
  useEffect(() => {
    if (!isOpen) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleClose();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [isOpen]);

  // Allow parent to control tray
  useImperativeHandle(ref, () => ({
    open: () => {
      setInputText('');     // clear field
      setIsOpen(true);      // show tray
    },
    close: () => {
      handleClose();
    },
  }));

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Handle selecting a place
  const handlePlaceSelect = (place: Place | null) => {
    if (!place) return;

    if (activeField === 'pickup') updateRideData({ pickupLocation: place });
    else updateRideData({ destination: place });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay - tappable to close */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />
      
      <View style={styles.container}>

        <Text style={styles.label}>
          {activeField === 'pickup' ? 'Enter Pickup Location' : 'Enter Destination'}
        </Text>

        <LocationSearch
          destination={inputText}
          onDestinationChange={setInputText}
          onPlaceSelect={handlePlaceSelect}
          placeholder={activeField === 'pickup' ? 'Pickup location' : 'Destination'}
          autoFocus={true}          
          />
      </View>
    </>
  );
});

InputTray.displayName = "InputTray";
export default InputTray;

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    zIndex: 999,
  },
  handle: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
});
