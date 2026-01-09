// app/driver/components/trays/RideRequestTray.tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IRButton } from '../../../../components/IRButton';
import { theme } from '../../../../constants/theme';

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9;

interface RideInfo {
  rideId?: string;
  passengerId?: string;
  passengerName?: string;
  passengerPic?: string;
  pickup: { address: string; latitude: number; longitude: number; name?: string };
  destination?: { address?: string; latitude?: number; longitude?: number; name?: string };
  offer?: number;
  offerType?: string;
  paymentMethod?: string;
  vehicleType?: string;
  distanceKm?: number;
  additionalInfo?: string;
  timestamp?: string;
}

interface Props {
  onClose?: () => void;
  driverId: string;
}

export interface RideRequestTrayRef {
  open: (rideData: RideInfo) => void;
  close: () => void;
}

const RideRequestTray = forwardRef<RideRequestTrayRef, Props>(({ onClose, driverId }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [ride, setRide] = useState<RideInfo | null>(null);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setRide(null);
    onClose?.();
  }, [onClose]);

  // Back button closes tray
  useEffect(() => {
    if (!isOpen) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    
    return () => backHandler.remove();
  }, [isOpen, handleClose]);

  // Expose open/close for parent
  useImperativeHandle(ref, () => ({
    open: (rideData: RideInfo) => {
      console.log('[RideRequestTray] Opening ride:', rideData, 'for driver:', driverId);
      setRide(rideData);
      setIsOpen(true);
    },
    close: () => handleClose(),
  }), [driverId, handleClose]);

  // Accept ride
  const handleAccept = async () => {
    if (!ride?.rideId) return;
    try {
      console.log(`[RideRequestTray] Accepting ride ${ride.rideId} by driver ${driverId}`);
      //await acceptRideAPI(ride.rideId, driverId);
      Alert.alert('Ride Accepted', `You accepted ride ${ride.rideId}`);
    } catch (err) {
      console.error('Error accepting ride:', err);
      Alert.alert('Error', 'Failed to accept ride');
    } finally {
      handleClose();
    }
  };

  // Decline ride
  const handleDecline = async () => {
    if (!ride?.rideId) return;
    try {
      console.log(`[RideRequestTray] Declining ride ${ride.rideId} by driver ${driverId}`);
      //await declineRideAPI(ride.rideId, driverId);
      Alert.alert('Ride Declined', `You declined ride ${ride.rideId}`);
    } catch (err) {
      console.error('Error declining ride:', err);
      Alert.alert('Error', 'Failed to decline ride');
    } finally {
      handleClose();
    }
  };

  if (!isOpen || !ride) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      {/* Tray */}
      <View style={styles.container}>
        <Text style={styles.title}>New Ride Request</Text>

        {/* Passenger Info */}
        {ride.passengerPic && (
          <Image
            source={{ uri: ride.passengerPic }}
            style={styles.passengerPic}
          />
        )}
        {ride.passengerName && (
          <>
            <Text style={styles.fieldLabel}>Passenger:</Text>
            <Text style={styles.fieldValue}>{ride.passengerName}</Text>
          </>
        )}

        {/* Pickup */}
        <Text style={styles.fieldLabel}>Pickup:</Text>
        <Text style={styles.fieldValue}>
          {ride.pickup.address || ride.pickup.name || 'Not specified'}
        </Text>

        {/* Destination */}
        {ride.destination && (
          <>
            <Text style={styles.fieldLabel}>Destination:</Text>
            <Text style={styles.fieldValue}>
              {ride.destination.address || ride.destination.name || 'Not specified'}
            </Text>
          </>
        )}

        {/* Vehicle Type */}
        {ride.vehicleType && (
          <>
            <Text style={styles.fieldLabel}>Vehicle Type:</Text>
            <Text style={styles.fieldValue}>{ride.vehicleType}</Text>
          </>
        )}

        {/* Payment */}
        {ride.paymentMethod && (
          <>
            <Text style={styles.fieldLabel}>Payment Method:</Text>
            <Text style={styles.fieldValue}>{ride.paymentMethod}</Text>
          </>
        )}

        {/* Offer */}
        {ride.offer !== undefined && (
          <>
            <Text style={styles.fieldLabel}>Offer:</Text>
            <Text style={styles.fieldValue}>${ride.offer.toFixed(2)}</Text>
          </>
        )}

        {/* Offer Type */}
        {ride.offerType !== undefined && (
          <>
            <Text style={styles.fieldLabel}>Offer Type:</Text>
            <Text style={styles.fieldValue}>{ride.offerType}</Text>
          </>
        )}

        {/* Distance */}
        {ride.distanceKm !== undefined && (
          <>
            <Text style={styles.fieldLabel}>Distance:</Text>
            <Text style={styles.fieldValue}>{ride.distanceKm.toFixed(2)} km</Text>
          </>
        )}

        {/* Additional Info */}
        {ride.additionalInfo && (
          <>
            <Text style={styles.fieldLabel}>Additional Info:</Text>
            <Text style={styles.fieldValue}>{ride.additionalInfo}</Text>
          </>
        )}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <IRButton title="Accept Ride" onPress={handleAccept} style={styles.acceptButton} />
          <IRButton title="Decline" onPress={handleDecline} variant="secondary" style={styles.declineButton} />
        </View>

        {/* Timestamp */}
        {ride.timestamp && (
          <Text style={styles.timestamp}>
            Requested: {new Date(ride.timestamp).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </>
  );
});

RideRequestTray.displayName = 'RideRequestTray';
export default RideRequestTray;

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    zIndex: 999,
  },
  title: {
    fontSize: 18, fontWeight: '700', marginBottom: 16,
    color: theme.colors.text, textAlign: 'center',
  },
  passengerPic: { width: 60, height: 60, borderRadius: 30, marginBottom: 12, alignSelf: 'center' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 8 },
  fieldValue: { fontSize: 16, fontWeight: '500', color: theme.colors.text, marginBottom: 8 },
  buttonContainer: { marginTop: 24, gap: 12 },
  acceptButton: { marginBottom: 8 },
  declineButton: { marginBottom: 8 },
  timestamp: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 16 },
});
