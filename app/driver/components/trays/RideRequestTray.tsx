// app/driver/components/trays/RideRequestTray.tsx
import { Ionicons } from '@expo/vector-icons';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { IRButton } from '../../../../components/IRButton';
import { OfferFareControl } from '../../../../components/OfferFareControl';
import { theme } from '../../../../constants/theme';
import { SubmissionState } from '../../index'; // Import the type

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9;

export interface RideRequestTrayRef {
  open: (
    rideId: string, 
    currentProgress: number, 
    remainingMs: number, 
    existingOffer: number | null, 
    status: SubmissionState, 
    rideData: any
  ) => void;
  close: () => void;
}

interface Props {
  driverId: string;
  onOfferSubmitted: (rideId: string, offer: number, baseOffer: number) => void;
  onClose?: () => void;
}

const RideRequestTray = forwardRef<RideRequestTrayRef, Props>(
  ({ driverId, onOfferSubmitted, onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [rideId, setRideId] = useState<string | null>(null);
    const [selectedRideData, setSelectedRideData] = useState<any>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    
    const [currentOffer, setCurrentOffer] = useState(0);
    const [currentStatus, setCurrentStatus] = useState<SubmissionState>('idle');

    const progressAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const baseOffer = selectedRideData?.offer ?? 0;
    const minOffer = selectedRideData?.priceRange?.min ?? baseOffer;
    const maxOffer = selectedRideData?.priceRange?.max ?? baseOffer;

    const handleClose = useCallback(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.stopAnimation();
      setIsOpen(false);
      setRideId(null);
      setSelectedRideData(null);
      setExpiresAt(null);
      // UPDATE: Reset status on close
      setCurrentStatus('idle');
      onClose?.();
    }, [onClose, progressAnim]);

    useImperativeHandle(ref, () => ({
      open: (rideId, currentProgress, remainingMs, existingOffer, status, rideData) => {
        setRideId(rideId);
        setSelectedRideData(rideData);
        setExpiresAt(Date.now() + remainingMs);
        
        // UPDATE: Initialize with parent-provided status and offer
        setCurrentStatus(status);
        setCurrentOffer(existingOffer ?? rideData.offer);
        
        setIsOpen(true);

        // UPDATE: Only run countdown animation/timer if the ride is not yet submitted
        if (status === 'idle') {
          progressAnim.setValue(currentProgress ?? 1);
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: remainingMs,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(handleClose, remainingMs);
        } else {
          // If already submitted, just stop animation at 0
          progressAnim.stopAnimation();
          progressAnim.setValue(0);
        }
      },
      close: handleClose,
    }), [handleClose, progressAnim]);

    const submitOffer = () => {
      if (!rideId || !selectedRideData || currentStatus !== 'idle') return;
      
      onOfferSubmitted(rideId, currentOffer, baseOffer);
      
      // UPDATE: Set local status to submitting immediately for UI feedback
      setCurrentStatus('submitting');
      
      // UPDATE: Clear timer because the driver has responded
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.stopAnimation();
    };

    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => backHandler.remove();
    }, [isOpen, handleClose]);

    if (!isOpen || !selectedRideData || !expiresAt) return null;

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.container}>
          {/* Map Section */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: selectedRideData.pickup?.latitude ?? -17.82,
                longitude: selectedRideData.pickup?.longitude ?? 31.04,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            />
          </View>

          {/* Middle Section */}
          <View style={styles.middleSection}>
            <View style={styles.topRow}>
              <View style={styles.leftCol}>
                <Image
                  source={{ uri: selectedRideData.passengerPic }}
                  style={styles.passengerPic}
                />
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={styles.ratingText}>{selectedRideData.passengerRating}</Text>
                </View>
              </View>

              <View style={styles.rightCol}>
                <View style={[styles.infoRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={[styles.infoRow, { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={styles.offerText}>
                        {/* UPDATE: Show base offer */}
                        ${(baseOffer)?.toFixed(2)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name={selectedRideData.paymentMethod === 'ecocash' ? 'wallet-outline' : 'cash-outline'}
                          size={14}
                          color="#475569"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.metaText}>
                          {selectedRideData.paymentMethod === 'ecocash' ? 'Ecocash' : 'Cash'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                          name="car-outline"
                          size={14}
                          color="#475569"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.metaText}>
                          {selectedRideData.vehicleType === '4seater' ? '4 Seater' :
                           selectedRideData.vehicleType === '7seater' ? '7 Seater' : 'Pickup Truck'}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.offerBadge,
                      selectedRideData.offerType === 'good' ? { backgroundColor: '#22c55e' } :
                      selectedRideData.offerType === 'fair' ? { backgroundColor: '#facc15' } :
                      selectedRideData.offerType === 'poor' ? { backgroundColor: '#ef4444' } :
                      { backgroundColor: '#25D366' },
                    ]}>
                      <Text style={styles.badgeText}>
                        {selectedRideData.offerType?.toUpperCase() || 'NEW'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-sharp" size={16} color="#25D366" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedRideData.pickup?.address}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="flag-sharp" size={16} color="#EA4335" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedRideData.destination?.address}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={16} color="#64748b" />
                  <Text style={styles.addressText}>
                    {selectedRideData.distanceKm?.toFixed(1)} km
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.additionalInfoRow}>
              <Ionicons name="information-circle-outline" size={16} color="#334155" />
              <Text style={styles.additionalInfoText} numberOfLines={1}>
                {selectedRideData.additionalInfo || 'No additional info'}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          {/* UPDATE: Only show progress bar if status is idle */}
          {currentStatus === 'idle' && (
            <View style={styles.timerWrapper}>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          )}

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* UPDATE: Conditional rendering based on currentStatus */}
            {currentStatus === 'submitted' || currentStatus === 'submitting' ? (
              <View style={styles.submittedContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color="#22c55e"
                  style={{ marginBottom: 8 }}
                />

                <Text style={styles.submittedTitle}>
                  Offer Submitted
                </Text>

                <Text style={styles.submittedText}>
                  You offered ${currentOffer.toFixed(2)}.{"\n"}
                  Passenger is reviewing your offer.
                </Text>
              </View>
            ) : (
              <>
                <OfferFareControl
                  minOffer={minOffer}
                  maxOffer={maxOffer}
                  initialOffer={currentOffer}
                  onOfferChange={setCurrentOffer}
                />

                <IRButton
                  title="Accept Ride"
                  loading={currentStatus === 'submitting'}
                  onPress={submitOffer}
                />
              </>
            )}

            <IRButton
              title="Close"
              variant="secondary"
              onPress={handleClose}
            />
          </View>

        </View>
      </>
    );
  },
);

RideRequestTray.displayName = 'RideRequestTray';
export default RideRequestTray;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 998,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface || '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    zIndex: 999,
  },
  mapContainer: {
    height: OPEN_HEIGHT * 0.4,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  middleSection: { flex: 1, marginBottom: 16 },
  topRow: { flexDirection: 'row', marginBottom: 12 },
  leftCol: { width: 80, alignItems: 'center' },
  passengerPic: {
    width: 70, height: 70, borderRadius: 35, marginBottom: 6,
    borderWidth: 2, borderColor: '#e2e8f0',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  rightCol: { flex: 1, paddingLeft: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  offerText: { fontSize: 20, fontWeight: '800', color: theme.colors.primary || '#25D366' },
  addressText: { fontSize: 13, color: '#475569', flex: 1 },
  offerBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    marginLeft: 'auto', alignSelf: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  additionalInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  additionalInfoText: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
  timerWrapper: { marginVertical: 10 },
  progressBar: { height: 2, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  bottomSection: { gap: 12, marginBottom: 10 },
  offerSection: {
    marginVertical: 12, paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  offerLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 10, textAlign: 'center' },
  offerControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  adjustBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: '#cbd5e1' },
  adjustText: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  offerDisplay: {
    minWidth: 90, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  offerValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  rangeText: { marginTop: 8, fontSize: 12, color: '#64748b', textAlign: 'center' },
  submittedContainer: { alignItems: 'center', paddingVertical: 20 },
  submittedTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  submittedText: { fontSize: 14, color: '#475569', textAlign: 'center' },
  metaText: { fontSize: 11, color: '#475569', fontWeight: '600' },
});