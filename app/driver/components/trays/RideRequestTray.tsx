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
import { theme } from '../../../../constants/theme';
import { handleDriverResponse } from '../../socketConnectionUtility/driverSocketService';

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9;

export interface RideRequestTrayRef {
  open: (rideData: any, currentProgress: number, remainingMs: number) => void;
  close: () => void;
}

interface Props {
  driverId: string;
  onClose?: () => void;
}

const RideRequestTray = forwardRef<RideRequestTrayRef, Props>(
  ({ driverId, onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [ride, setRide] = useState<any>(null);

    const progressAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** ---------------- Offer logic ---------------- */
    const baseOffer = ride?.offer ?? 0;
    const minOffer = ride?.priceRange?.min ?? baseOffer;
    const maxOffer = ride?.priceRange?.max ?? baseOffer;

    const [currentOffer, setCurrentOffer] = useState(baseOffer);

    useEffect(() => {
      if (ride) setCurrentOffer(ride.offer ?? 0);
    }, [ride]);

    const decreaseOffer = () => {
      setCurrentOffer((prev: number) =>
        Math.max(minOffer, Number((prev - 0.5).toFixed(2)))
      );
    };

    const increaseOffer = () => {
      setCurrentOffer((prev: number) =>
        Math.min(maxOffer, Number((prev + 0.5).toFixed(2)))
      );
    };


    const responseType =
      currentOffer === baseOffer ? 'accept' : 'counter';

    /** ---------------- Tray controls ---------------- */
    const handleClose = useCallback(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.stopAnimation();
      setIsOpen(false);
      setRide(null);
      onClose?.();
    }, [onClose, progressAnim]);

    useImperativeHandle(
      ref,
      () => ({
        open: (rideData, currentProgress, remainingMs) => {
          setRide(rideData);
          setIsOpen(true);

          if (timerRef.current) clearTimeout(timerRef.current);

          const safeProgress =
            typeof currentProgress === 'number' ? currentProgress : 1;
          const safeRemaining =
            typeof remainingMs === 'number' && remainingMs > 0
              ? remainingMs
              : 0;

          progressAnim.setValue(safeProgress);

          Animated.timing(progressAnim, {
            toValue: 0,
            duration: safeRemaining,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();

          timerRef.current = setTimeout(handleClose, safeRemaining);
        },
        close: handleClose,
      }),
      [handleClose, progressAnim],
    );

    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleClose();
          return true;
        },
      );
      return () => backHandler.remove();
    }, [isOpen, handleClose]);

    if (!isOpen || !ride) return null;

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
          {/* ------------------ Top Section: Map ------------------ */}
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: ride.pickup?.latitude ?? -17.82,
                longitude: ride.pickup?.longitude ?? 31.04,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            />
          </View>

          {/* ------------------ Middle Section ------------------ */}
          <View style={styles.middleSection}>
            <View style={styles.topRow}>
              {/* Left column */}
              <View style={styles.leftCol}>
                <Image
                  source={{
                    uri:
                      ride.passengerPic ||
                      'https://via.placeholder.com/80',
                  }}
                  style={styles.passengerPic}
                />
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={styles.ratingText}>
                    {ride.passengerRating ?? '5.0'}
                  </Text>
                </View>
              </View>

              {/* Right column */}
              <View style={styles.rightCol}>
                <View
                  style={[
                    styles.infoRow,
                    { justifyContent: 'space-between' },
                  ]}
                >
                  <Text style={styles.offerText}>
                    ${ride.offer?.toFixed(2)}
                  </Text>

                  <View
                    style={[
                      styles.offerBadge,
                      ride.offerType === 'good'
                        ? { backgroundColor: '#22c55e' }
                        : ride.offerType === 'fair'
                        ? { backgroundColor: '#facc15' }
                        : ride.offerType === 'poor'
                        ? { backgroundColor: '#ef4444' }
                        : { backgroundColor: '#25D366' },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {ride.offerType?.toUpperCase() || 'NEW'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location-sharp" size={16} color="#25D366" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {ride.pickup?.address}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="flag-sharp" size={16} color="#EA4335" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {ride.destination?.address}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={16} color="#64748b" />
                  <Text style={styles.addressText}>
                    {ride.distanceKm?.toFixed(1)} km
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.additionalInfoRow}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#334155"
              />
              <Text style={styles.additionalInfoText} numberOfLines={1}>
                {ride.additionalInfo || 'No additional info'}
              </Text>
            </View>
          </View>

          {/* ------------------ Countdown Ribbon ------------------ */}
          <View style={styles.timerWrapper}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[styles.progressFill, { width: progressWidth }]}
              />
            </View>
          </View>

          {/* ------------------ Bottom Section ------------------ */}
          <View style={styles.bottomSection}>
            {/* Offer your fare */}
            <View style={styles.offerSection}>
              <Text style={styles.offerLabel}>Offer your fare</Text>

              <View style={styles.offerControl}>
                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    currentOffer <= minOffer && styles.disabledBtn,
                  ]}
                  onPress={decreaseOffer}
                  disabled={currentOffer <= minOffer}
                >
                  <Text style={styles.adjustText}>−</Text>
                </TouchableOpacity>

                <View style={styles.offerDisplay}>
                  <Text style={styles.offerValue}>
                    ${currentOffer.toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.adjustBtn,
                    currentOffer >= maxOffer && styles.disabledBtn,
                  ]}
                  onPress={increaseOffer}
                  disabled={currentOffer >= maxOffer}
                >
                  <Text style={styles.adjustText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.rangeText}>
                Range: ${minOffer.toFixed(2)} – ${maxOffer.toFixed(2)}
              </Text>
            </View>

            {/* Action buttons */}
            <IRButton
              title="Accept Ride"
              onPress={() => {
                handleDriverResponse(
                  ride.rideId,
                  driverId,
                  currentOffer,
                  responseType,
                );
                handleClose();
              }}
            />

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

  /* ------------------ MAP ------------------ */
  mapContainer: {
    height: OPEN_HEIGHT * 0.4,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb', // placeholder background
  },

  /* ------------------ MIDDLE SECTION ------------------ */
  middleSection: {
    flex: 1,
    marginBottom: 16,
  },

  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  leftCol: {
    width: 80,
    alignItems: 'center',
  },

  passengerPic: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  rightCol: {
    flex: 1,
    paddingLeft: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  offerText: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary || '#25D366',
  },

  detailText: {
    fontSize: 13,
    color: '#334155',
  },

  addressText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },

  offerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  additionalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  additionalInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },

  /* ------------------ COUNTDOWN ------------------ */
  timerWrapper: {
    marginVertical: 10,
  },

  progressBar: {
    height: 2,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },

  /* ------------------ ACTIONS ------------------ */
  bottomSection: {
    gap: 12,
    marginBottom: 10,
  },

  /* ------------------ OFFER YOUR FARE ------------------ */
  offerSection: {
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  offerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textAlign: 'center',
  },

  offerControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  adjustBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledBtn: {
    backgroundColor: '#cbd5e1',
  },

  adjustText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },

  offerDisplay: {
    minWidth: 90,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },

  offerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },

  rangeText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
