// app/driver/components/trays/RideRequestTray.tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import {
    BackHandler,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IRButton } from '../../../../components/IRButton';
import { theme } from '../../../../constants/theme';

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9;

interface RideInfo {
  additionalInfo?: string;
  pickup: { address: string; latitude: number; longitude: number; name?: string };
  destination?: { address?: string; latitude?: number; longitude?: number; name?: string };
  offer?: number;
  paymentMethod?: string;
  vehicleType?: string;
  timestamp?: string;
  rideId?: string;
  passengerId?: string;
  passengerName?: string;
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

  // Handle close with useCallback to prevent infinite re-renders
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
      console.log('[RideRequestTray] Opening with ride:', rideData, 'for driver:', driverId);
      setRide(rideData);
      setIsOpen(true);
    },
    close: () => handleClose(),
  }), [driverId, handleClose]);

  const handleAccept = () => {
    console.log('[RideRequestTray] Accepted ride:', ride, 'by driver:', driverId);
    // Here you would typically make an API call to accept the ride
    // For example: acceptRide(ride.rideId, driverId);
    
    // Show acceptance message
    if (ride?.rideId) {
      console.log(`Driver ${driverId} accepted ride ${ride.rideId}`);
      // You can add API call here:
      // await socketService.acceptRide(ride.rideId, driverId);
    }
    
    handleClose();
  };

  const handleDecline = () => {
    console.log('[RideRequestTray] Declined ride:', ride, 'by driver:', driverId);
    // Here you would typically make an API call to decline the ride
    // For example: declineRide(ride.rideId, driverId);
    
    if (ride?.rideId) {
      console.log(`Driver ${driverId} declined ride ${ride.rideId}`);
      // You can add API call here:
      // await socketService.declineRide(ride.rideId, driverId);
    }
    
    handleClose();
  };

  if (!isOpen || !ride) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* Tray */}
      <View style={styles.container}>
        <Text style={styles.title}>New Ride Request</Text>
        
        {ride.passengerName && (
          <>
            <Text style={styles.fieldLabel}>Passenger:</Text>
            <Text style={styles.fieldValue}>{ride.passengerName}</Text>
          </>
        )}
        
        <Text style={styles.fieldLabel}>Pickup:</Text>
        <Text style={styles.fieldValue}>
          {ride.pickup.address || ride.pickup.name || 'Location not specified'}
        </Text>

        <Text style={styles.fieldLabel}>Destination:</Text>
        <Text style={styles.fieldValue}>
          {ride.destination?.address || ride.destination?.name || 'Not specified'}
        </Text>

        {ride.offer && (
          <>
            <Text style={styles.fieldLabel}>Offer:</Text>
            <Text style={styles.fieldValue}>${ride.offer.toFixed(2)}</Text>
          </>
        )}

        {ride.paymentMethod && (
          <>
            <Text style={styles.fieldLabel}>Payment Method:</Text>
            <Text style={styles.fieldValue}>{ride.paymentMethod}</Text>
          </>
        )}

        {ride.vehicleType && (
          <>
            <Text style={styles.fieldLabel}>Vehicle Type:</Text>
            <Text style={styles.fieldValue}>{ride.vehicleType}</Text>
          </>
        )}

        {ride.additionalInfo && (
          <>
            <Text style={styles.fieldLabel}>Additional Info:</Text>
            <Text style={styles.fieldValue}>{ride.additionalInfo}</Text>
          </>
        )}

        <View style={styles.buttonContainer}>
          <IRButton 
            title="Accept Ride" 
            onPress={handleAccept} 
            style={styles.acceptButton}
          />
          <IRButton
            title="Decline"
            onPress={handleDecline}
            variant="secondary"
            style={styles.declineButton}
          />
        </View>
        
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, // Assuming theme.borderRadius.xl = 24
    borderTopRightRadius: 24,
    padding: 16, // Assuming theme.spacing.md = 16
    zIndex: 999,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 8, // theme.spacing.sm
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  acceptButton: {
    marginBottom: 8,
  },
  declineButton: {
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});