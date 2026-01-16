// app/driver/components/RideRequestCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { IRAvatar } from '../../../components/IRAvatar';

const SLIDE_DURATION = 300;

interface Props {
  rideId: string;
  rideData: any;
  expiresAt: number; // Unix timestamp in milliseconds
  submittedOffer?: number;
  onExpire?: (rideId: string) => void;
  onSelect?: (rideId: string, currentProgress: number, remainingMs: number, rideData: any) => void;
}

export default function RideRequestCard({ 
  rideId, 
  rideData, 
  expiresAt, 
  submittedOffer, 
  onExpire, 
  onSelect 
}: Props) {
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressValue = useRef(1);
  const animationStartedRef = useRef(false);

  const isSubmitted = submittedOffer !== undefined;

  const slideOut = useCallback((cb?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -500,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => cb?.());
  }, [slideAnim]);

  const handleSelect = () => {
    //if (isSubmitted) return;
    const currentProgress = progressValue.current;
    const nowRemaining = expiresAt - Date.now();
    const liveRemaining = Math.max(0, nowRemaining);
    onSelect?.(rideId, currentProgress, liveRemaining, rideData);
  };

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressValue.current = value;
    });

    // If already submitted, stop all animations and timers
    if (isSubmitted) {
      progressAnim.stopAnimation();
      if (timerRef.current) clearTimeout(timerRef.current);
      return () => progressAnim.removeListener(listenerId);
    }

    // Calculate remaining time
    const remainingMs = expiresAt - Date.now();
    
    // If already expired, remove immediately
    if (remainingMs <= 0) {
      slideOut(() => onExpire?.(rideId));
      return () => progressAnim.removeListener(listenerId);
    }

    // Start slide in animation
    if (!animationStartedRef.current) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      animationStartedRef.current = true;
    }

    // Start progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Set expiration timeout
    timerRef.current = setTimeout(() => {
      slideOut(() => onExpire?.(rideId));
    }, remainingMs);

    // Cleanup
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      progressAnim.removeListener(listenerId);
    };
  }, [expiresAt, isSubmitted, onExpire, rideId, slideAnim, slideOut, progressAnim]);

  // Update progress value based on current time (for more accurate progress display)
  useEffect(() => {
    if (isSubmitted) return;

    const updateProgress = () => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        // Progress bar should be at 0 (empty)
        progressAnim.setValue(0);
        return;
      }
      
      // Calculate total duration and elapsed time
      const totalDuration = rideData.expiresIn || 60000;
      const elapsedTime = totalDuration - remainingMs;
      const progress = Math.max(0, Math.min(1, elapsedTime / totalDuration));
      
      // Update animation value if it's significantly different
      if (Math.abs(progressValue.current - progress) > 0.01) {
        progressAnim.setValue(1 - progress);
      }
    };

    // Initial update
    updateProgress();

    // Update progress every 250ms for smoother animation
    const interval = setInterval(updateProgress, 10);
    return () => clearInterval(interval);
  }, [expiresAt, isSubmitted, rideData.expiresIn, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Handle case where ride might have already expired before component mounts
  useEffect(() => {
    const checkInitialExpiry = () => {
      if (!isSubmitted && expiresAt <= Date.now()) {
        // Small delay to allow slide-in animation
        setTimeout(() => {
          slideOut(() => onExpire?.(rideId));
        }, 100);
      }
    };

    checkInitialExpiry();
  }, [expiresAt, isSubmitted, onExpire, rideId, slideOut]);

  return (
    <Animated.View 
      style={[
        styles.card, 
        { transform: [{ translateX: slideAnim }] },
        isSubmitted && styles.submittedCard
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handleSelect}>
        <View style={[styles.row, isSubmitted && styles.submittedContent]}>
          <View style={styles.leftCol}>
            <IRAvatar
              source={rideData.passengerPic ? { uri: rideData.passengerPic } : undefined}
              name={rideData.passengerName}
              size="md"
            />
            <Text style={styles.name} numberOfLines={1}>
              {rideData.passengerName || 'Passenger'}
            </Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text style={styles.ratingText}>{rideData.passengerRating ?? '5.0'}</Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={styles.topRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Text style={styles.offerText}>
                  ${(rideData.offer)?.toFixed(2) ?? '--'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={rideData.paymentMethod === 'ecocash' ? 'wallet-outline' : 'cash-outline'}
                    size={14}
                    color="#475569"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.metaText}>
                    {rideData.paymentMethod === 'ecocash' ? 'Ecocash' : 'Cash'}
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
                    {rideData.vehicleType === '4seater' ? '4 Seater' :
                     rideData.vehicleType === '7seater' ? '7 Seater' : 'Pickup Truck'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.badge,
                {
                  backgroundColor: isSubmitted ? '#64748b' :
                    rideData.offerType === 'good' ? '#10B981' :
                    rideData.offerType === 'fair' ? '#F59E0B' :
                    rideData.offerType === 'poor' ? '#EF4444' : '#25D366',
                },
              ]}>
                <Text style={styles.badgeText}>
                  {isSubmitted ? 'WAITING' : (rideData.offerType?.toUpperCase() || 'NEW')}
                </Text>
              </View>
            </View>
            
            {isSubmitted && (
              <Text style={styles.waitingLabel}>
                 ${(isSubmitted ? submittedOffer : rideData.offer)?.toFixed(2) ?? '--'} Offer submitted, waiting for response...
              </Text>
            )}

            <View style={styles.addressContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="location-sharp" size={16} color="#25D366" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {rideData.pickup?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="flag-sharp" size={16} color="#EA4335" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {rideData.destination?.address || 'Destination'}
                </Text>
              </View>
            </View>
            {rideData.additionalInfo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Ionicons name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.additionalInfoText} numberOfLines={1} ellipsizeMode="tail">
                  {rideData.additionalInfo}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      {!isSubmitted && (
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    marginBottom: 12, 
    elevation: 4, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden' 
  },
  submittedCard: {
    backgroundColor: '#f1f5f9',
    elevation: 1,
  },
  submittedContent: {
    opacity: 0.6,
  },
  waitingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  row: { flexDirection: 'row', padding: 14 },
  leftCol: { width: 85, alignItems: 'center', justifyContent: 'center' },
  rightCol: { flex: 1, paddingLeft: 12 },
  name: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offerText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  additionalInfoText: { fontSize: 12, color: '#475569', fontStyle: 'italic', flex: 1 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  addressContainer: { gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#475569', flex: 1 },
  progressBar: { height: 6, backgroundColor: '#f1f5f9' },
  progressFill: { height: '100%', backgroundColor: '#25D366' },
});