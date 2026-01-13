// app/driver/components/RideRequestCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

interface Ride {
  rideId: string;
  pickup?: { address?: string; latitude: number; longitude: number };
  destination?: { address?: string; latitude: number; longitude: number };
  vehicleType?: string;
  passengerPic?: string;
  passengerName?: string;
  passengerRating?: number;
  additionalInfo?: string;
  distanceKm?: number;
  offer?: number;
  offerType?: 'poor' | 'fair' | 'good';
  expiresIn?: number;
  expiresAt?: number;
}

interface Props {
  ride: Ride;
  onExpire?: (ride: Ride) => void;
  onSelect?: (ride: Ride, currentProgress: number, remainingMs: number) => void;
}

export default function RideRequestCard({ ride, onExpire, onSelect }: Props) {
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ⚡ SAFETY: This ref stores the actual number for the tray to avoid "undefined" crash
  const progressValue = useRef(1);

  const [initialRemainingMs] = useState<number>(() => {
    if (ride.expiresAt) {
      const diff = new Date(ride.expiresAt).getTime() - Date.now();
      return diff > 0 ? diff : 0;
    }
    // Fallback to expiresIn (which the log shows is 160000ms)
    return ride.expiresIn ?? 60000;
  });

  const slideOut = useCallback((cb?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -500,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => cb?.());
  }, [slideAnim]);

  const handleSelect = () => {
    // ⚡ Pass the value from the listener ref, not the animated object
    const currentProgress = progressValue.current; 
    
    const nowMs = ride.expiresAt 
      ? new Date(ride.expiresAt).getTime() - Date.now() 
      : initialRemainingMs; // Fallback calculation
    
    const liveRemaining = nowMs > 0 ? nowMs : 0;

    onSelect?.(ride, currentProgress, liveRemaining);
  };

  useEffect(() => {
    // ⚡ START LISTENER: Keeps progressValue.current in sync with the animation
    const listenerId = progressAnim.addListener(({ value }) => {
      progressValue.current = value;
    });

    if (initialRemainingMs <= 0) {
      onExpire?.(ride);
      return;
    }

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: initialRemainingMs,
      easing: Easing.linear,
      useNativeDriver: false, // width cannot use native driver
    }).start();

    // Auto-expire timer
    timerRef.current = setTimeout(() => {
      slideOut(() => onExpire?.(ride));
    }, initialRemainingMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // ⚡ CLEANUP: Remove listener to prevent memory leaks
      progressAnim.removeListener(listenerId);
    };
  }, [initialRemainingMs, onExpire, progressAnim, ride, slideAnim, slideOut]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.card, { transform: [{ translateX: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={handleSelect}>
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <IRAvatar
              source={ride.passengerPic ? { uri: ride.passengerPic } : undefined}
              name={ride.passengerName}
              size="md"
            />
            <Text style={styles.name} numberOfLines={1}>
                {ride.passengerName || 'Passenger'}
            </Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color="#FFC107" />
              <Text style={styles.ratingText}>{ride.passengerRating ?? '5.0'}</Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            <View style={styles.topRow}>
              <Text style={styles.offerText}>
                ${ride.offer ?? '--'} · {ride.vehicleType ?? 'Standard'} · {ride.distanceKm ? ride.distanceKm.toFixed(1) + ' km' : '--'}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      ride.offerType === 'good'
                        ? '#10B981'
                        : ride.offerType === 'fair'
                        ? '#F59E0B'
                        : ride.offerType === 'poor'
                        ? '#EF4444'
                        : '#25D366', // default NEW
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {ride.offerType?.toUpperCase() || 'NEW'}
                </Text>
              </View>
            </View>

            <View style={styles.addressContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="location-sharp" size={16} color="#25D366" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {ride.pickup?.address || 'Pickup'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="flag-sharp" size={16} color="#EA4335" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {ride.destination?.address || 'Destination'}
                </Text>
              </View>
              {ride.additionalInfo ? (
                <View style={styles.additionalInfoRow}>
                  <Ionicons name="information-circle-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                  <Text style={styles.additionalInfo} numberOfLines={1}>
                    {ride.additionalInfo}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
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
  row: { flexDirection: 'row', padding: 14 },
  leftCol: { width: 85, alignItems: 'center', justifyContent: 'center' },
  rightCol: { flex: 1, paddingLeft: 12 },
  name: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  offerText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  addressContainer: { gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#475569', flex: 1 },
  progressBar: { height: 6, backgroundColor: '#f1f5f9' },
  progressFill: { height: '100%', backgroundColor: '#25D366' },
additionalInfoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
  flexShrink: 1,
},
additionalInfo: {
  fontSize: 12,
  color: '#475569',
  fontStyle: 'italic',
  flexShrink: 1,
},


});