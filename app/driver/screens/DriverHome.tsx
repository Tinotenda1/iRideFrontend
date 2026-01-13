// app/driver/screens/DriverHome.tsx
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import RideRequestCard from '../components/RideRequestCard';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


interface Props {
  online: boolean;
  isConnecting: boolean;

  incomingRides?: any[]; // multiple rides
  onRideAccept?: (ride: any) => void;
  onRideDecline?: (ride: any) => void;
  onRideSelect: (ride: any, progress: number, msLeft: number) => void;
}

/* ---------------------------------------------
 * Animation constants
 * ------------------------------------------- */
const PULSE_COUNT = 3;
const PULSE_DURATION = 2500;
const POINT_COUNT = 8;

const DriverHome: React.FC<Props> = ({
  online,
  isConnecting,
  incomingRides,
  onRideAccept,
  onRideDecline,
  onRideSelect,
}) => {
  /* ---------------------------------------------
   * Animation refs
   * ------------------------------------------- */
  const pulses = useRef(
    Array.from({ length: PULSE_COUNT }, () => new Animated.Value(0))
  ).current;

  const textAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pulseLoops = useRef<Animated.CompositeAnimation[]>([]).current;

  const points = useRef(
    Array.from({ length: POINT_COUNT }, () => ({
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      size: Math.random() * 8 + 5,
      anim: new Animated.Value(0),
    }))
  ).current;

  /* ---------------------------------------------
   * Animation controller
   * ------------------------------------------- */
  useEffect(() => {
    if (online && !isConnecting) {
      fadeAnim.setValue(0);

      pulseLoops.length = 0;
      pulses.forEach((pulse, index) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay((PULSE_DURATION / PULSE_COUNT) * index),
            Animated.timing(pulse, {
              toValue: 1,
              duration: PULSE_DURATION,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
        pulseLoops.push(loop);
        loop.start();
      });

      Animated.loop(
        Animated.sequence([
          Animated.timing(textAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(textAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      points.forEach((p) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(p.anim, {
              toValue: 1,
              duration: 800 + Math.random() * 800,
              useNativeDriver: true,
            }),
            Animated.timing(p.anim, {
              toValue: 0,
              duration: 800 + Math.random() * 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      pulseLoops.forEach((l) => l.stop());
      pulses.forEach((p) => p.setValue(0));
      textAnim.setValue(0);
      points.forEach((p) => p.anim.setValue(0));

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [online, isConnecting, fadeAnim, pulseLoops, points, pulses, textAnim]);

  // ---------------------------------------------
  // Smoothly animate incoming rides layout changes
  // ---------------------------------------------
  useEffect(() => {
    if (incomingRides && incomingRides.length > 0) {
      LayoutAnimation.configureNext({
        duration: 500,
        create: {
          type: LayoutAnimation.Types.spring,
          property: LayoutAnimation.Properties.scaleXY,
          springDamping: 0.9,
        },
        update: {
          type: LayoutAnimation.Types.spring,
          springDamping: 0.9,
        },
        delete: {
          type: LayoutAnimation.Types.linear,
          property: LayoutAnimation.Properties.opacity,
          duration: 200,
        },
      });
    }
  }, [incomingRides]);


  /* ---------------------------------------------
   * Render helpers
   * ------------------------------------------- */
  const renderPulses = () =>
    pulses.map((pulse, i) => {
      const scale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 3],
      });
      const opacity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 0],
      });

      return (
        <Animated.View
          key={i}
          style={[styles.radarCircle, { transform: [{ scale }], opacity }]}
        />
      );
    });

  const renderPoints = () =>
    points.map((p, i) => (
      <Animated.View
        key={i}
        style={[
          styles.point,
          {
            width: p.size,
            height: p.size,
            left: 150 + p.x,
            top: 150 + p.y,
            opacity: p.anim,
          },
        ]}
      />
    ));

  const textOpacity = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  /* ---------------------------------------------
   * UI states
   * ------------------------------------------- */
  if (!online) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={120} color="#aaa" />
        <Text style={styles.title}>You are Offline</Text>
        <Text style={styles.subtitle}>
          Turn online to start receiving ride requests
        </Text>
      </View>
    );
  }

  if (isConnecting) {
    return (
      <View style={styles.center}>
        <Ionicons name="wifi-outline" size={120} color={theme.colors.warning} />
        <Text style={styles.title}>Connecting…</Text>
        <Text style={styles.subtitle}>
          Checking network and syncing with server
        </Text>
      </View>
    );
  }

  /* ---------------------------------------------
   * Radar + Incoming rides
   * ------------------------------------------- */
  return (
    <View style={styles.container}>
      <View style={styles.radar} pointerEvents="none">
        {renderPulses()}
        {renderPoints()}
        <View style={styles.centerDot} />
      </View>

      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.searchText}>Searching for riders…</Text>
      </Animated.View>

      {/* ---------------------------------------------
          Incoming Ride Requests (stack + scroll)
      --------------------------------------------- */}
      {incomingRides && incomingRides.length > 0 && (
        <View style={styles.rideStackContainer}>
          <FlatList
            data={[...incomingRides].reverse()}
            keyExtractor={(item) => item.rideId} // CRITICAL: Must be a unique ID
            removeClippedSubviews={false} // Prevents "flashing" during layout shifts
            renderItem={({ item }) => (
              <View style={{ marginVertical: 5 }}> 
                <RideRequestCard
                  ride={item}
                  onSelect={onRideSelect}
                  onExpire={onRideDecline}
                />
              </View>
            )}
            contentContainerStyle={{ paddingVertical: 10, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

export default DriverHome;

/* ---------------------------------------------
 * Styles
 * ------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  radar: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(52,152,219,0.25)',
  },
  point: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  centerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 10,
  },
  searchText: {
    marginTop: 40,
    fontSize: 22,
    fontWeight: '700',
  },
  rideStackContainer: {
    position: 'absolute',
    top: 0, // adjust to appear below radar
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
});
