// app/driver/components/RideRequestCard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const SLIDE_DURATION = 300;

interface Ride {
  rideId: string;
  pickup?: { name?: string; latitude: number; longitude: number };
  distanceKm?: number;
  offer?: number;
  offerType?: string;
  expiresInMs?: number;
  expiresAt?: number;
}

interface RideRequestCardProps {
  ride: Ride;
  onExpire?: (ride: Ride) => void;
  onAccept?: (ride: Ride) => void;
  onDecline?: (ride: Ride) => void;
  onSelect?: (ride: Ride) => void;
}

export default function RideRequestCard({
  ride,
  onExpire,
  onAccept,
  onDecline,
  onSelect,
}: RideRequestCardProps) {
  const slideAnim = useRef(new Animated.Value(-350)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const expireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [remainingMs] = useState<number>(() => {
    if (ride?.expiresAt) {
      const msLeft = new Date(ride.expiresAt).getTime() - Date.now();
      return msLeft > 0 ? msLeft : 0;
    }
    return ride?.expiresInMs ?? 30000;
  });

  const slideOutLeft = useCallback((callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: -500, // Increased to ensure it clears all screen sizes
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => callback?.());
  }, [slideAnim]);

  const slideOutRight = useCallback((callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 500, // ⚡ CHANGED: Positive value moves the card to the RIGHT
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => callback?.());
  }, [slideAnim]);

  useEffect(() => {
    if (remainingMs <= 0) {
      onExpire?.(ride);
      return;
    }

    // Slide in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: SLIDE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Expiry timer
    expireTimer.current = setTimeout(() => {
      slideOutLeft(() => onExpire?.(ride));
    }, remainingMs);

    return () => {
      if (expireTimer.current) clearTimeout(expireTimer.current);
    };
  }, [remainingMs, onExpire, ride, slideAnim, progressAnim, slideOutLeft]);

  const handleDecline = () => {
    if (expireTimer.current) clearTimeout(expireTimer.current);
    slideOutLeft(() => onDecline?.(ride));
  };

  const handleAccept = () => {
    if (expireTimer.current) clearTimeout(expireTimer.current);
    slideOutRight(() => onAccept?.(ride));
  };

  const handleSelect = () => {
    onSelect?.(ride);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handleSelect}>
        <View style={styles.content}>
          <Text style={styles.title}>🚕 New Ride Request</Text>

          <Text style={styles.text}>
            {ride.pickup?.name || 'Pickup location'}
          </Text>

          <Text style={styles.text}>
            {ride.pickup?.name || 'Pickup location'}
          </Text>

          <Text style={styles.subText}>
            {ride.distanceKm ?? '--'} km away · Offer ${ride.offer ?? '--' } · {ride.offerType ?? 'N/A'}  
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* ⏳ Progress Ribbon */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  declineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  declineText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  acceptBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  acceptText: {
    color: '#fff',
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#eee',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#25D366',
  },
});
