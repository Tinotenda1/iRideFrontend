// app/driver/screens/DriverHome.tsx
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity, // Added
  UIManager,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import RideRequestCard from "../components/RideRequestCard";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RideState {
  rideId: string;
  expiresAt: number;
  data: any;
}

interface Props {
  online: boolean;
  isConnecting: boolean;
  incomingRides?: any[];
  submittedOffers: { [rideId: string]: number };
  onRideSelect: (
    rideId: string,
    progress: number,
    msLeft: number,
    rideData: any,
  ) => void;
  onRideExpire: (ride: any) => void;
  trayPadding: number;
}

const DEFAULT_EXPIRE_TIME = 10000;

const DriverHome: React.FC<Props> = ({
  online,
  isConnecting,
  incomingRides = [],
  submittedOffers,
  onRideSelect,
  onRideExpire,
  trayPadding,
}) => {
  const [rides, setRides] = useState<RideState[]>([]);
  const lastProcessedRidesRef = useRef<Set<string>>(new Set());

  // MAP STATES
  const mapRef = useRef<MapView>(null);
  const [userRegion, setUserRegion] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [showRecenter, setShowRecenter] = useState(false); // Track button visibility

  // ANIMATION VALUES
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1. MAP LOGIC: LOAD USER LOCATION
  useEffect(() => {
    const loadLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMapLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };

      setUserRegion(region);
      setMapLoading(false);
    };

    loadLocation();
  }, []);

  // 2. RIDE PROCESSING LOGIC
  useEffect(() => {
    if (!incomingRides || incomingRides.length === 0) {
      setRides([]);
      lastProcessedRidesRef.current.clear();
      return;
    }

    const currentRideIds = new Set(incomingRides.map((ride) => ride.rideId));
    const newRides: RideState[] = [];

    incomingRides.forEach((ride) => {
      if (!lastProcessedRidesRef.current.has(ride.rideId)) {
        const expiresIn = ride.expiresIn || DEFAULT_EXPIRE_TIME;
        const expiresAt = Date.now() + expiresIn;
        newRides.push({ rideId: ride.rideId, expiresAt, data: ride });
        lastProcessedRidesRef.current.add(ride.rideId);
      }
    });

    setRides((prev) => {
      const filteredPrev = prev.filter((ride) =>
        currentRideIds.has(ride.rideId),
      );
      const updatedPrev = filteredPrev.map((prevRide) => {
        const currentData = incomingRides.find(
          (r) => r.rideId === prevRide.rideId,
        );
        return currentData ? { ...prevRide, data: currentData } : prevRide;
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return [...updatedPrev, ...newRides];
    });

    lastProcessedRidesRef.current.forEach((id) => {
      if (!currentRideIds.has(id)) lastProcessedRidesRef.current.delete(id);
    });
  }, [incomingRides]);

  // 3. RADAR ANIMATION LOOP
  useEffect(() => {
    if (online && !isConnecting) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [online, isConnecting, pulseAnim]);

  // 4. HANDLERS
  const handleCardSelect = useCallback(
    (rideId: string, progress: number, msLeft: number, rideData: any) => {
      onRideSelect(rideId, progress, msLeft, rideData);
    },
    [onRideSelect],
  );

  const handleCardExpire = useCallback(
    (rideId: string) => {
      const rideState = rides.find((r) => r.rideId === rideId);
      if (rideState) onRideExpire(rideState.data);
    },
    [rides, onRideExpire],
  );

  const handleRecenter = () => {
    if (userRegion && mapRef.current) {
      mapRef.current.animateToRegion(userRegion, 1000);
      setShowRecenter(false);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    if (!userRegion) return;

    // Check if user has moved the map significantly from their location
    const latDiff = Math.abs(region.latitude - userRegion.latitude);
    const lngDiff = Math.abs(region.longitude - userRegion.longitude);

    // threshold of ~0.001 (~100 meters)
    if (latDiff > 0.001 || lngDiff > 0.001) {
      setShowRecenter(true);
    } else {
      setShowRecenter(false);
    }
  };

  // OFFLINE VIEW
  if (!online) {
    return (
      <View style={styles.offlineContainer}>
        <View style={styles.offlineIcon}>
          <Ionicons name="moon-outline" size={60} color="#94a3b8" />
        </View>
        <Text style={styles.title}>You are Offline</Text>
        <Text style={styles.subtitle}>
          Turn online to start receiving ride requests
        </Text>
      </View>
    );
  }

  // LOADING VIEW
  if (mapLoading || !userRegion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* BACKGROUND LAYER: MAP */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        mapPadding={{
          top: 60,
          right: 0,
          bottom: trayPadding,
          left: 0,
        }}
        initialRegion={userRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onRegionChangeComplete={onRegionChangeComplete} // Track movement
        loadingEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
      />

      {/* MIDDLE LAYER: RADAR RADIAL */}
      <View
        style={[
          styles.radarLayer,
          {
            top: 60,
            bottom: trayPadding,
          },
        ]}
        pointerEvents="none"
      >
        <Animated.View
          style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}
        />
        <Animated.View
          style={[
            styles.pulseCircleOuter,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <View style={styles.driverDot} />
      </View>

      {/* RECENTER BUTTON (FLOATS ABOVE TRAY) */}
      {showRecenter && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayPadding + 16 }]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      )}

      {/* TOP LAYER: SCROLLABLE RIDE STACK */}
      {rides.length > 0 && (
        <View
          style={[
            styles.rideStackContainer,
            {
              top: 10,
              bottom: 160,
            },
          ]}
          pointerEvents="box-none"
        >
          <FlatList
            data={[...rides].reverse()}
            keyExtractor={(item) => item.rideId}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <RideRequestCard
                  rideId={item.rideId}
                  rideData={item.data}
                  expiresAt={item.expiresAt}
                  submittedOffer={submittedOffers[item.rideId]}
                  onSelect={handleCardSelect}
                  onExpire={handleCardExpire}
                />
              </View>
            )}
            contentContainerStyle={{
              paddingHorizontal: 16,
              //paddingTop: 10,
              //paddingBottom: 10,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f3f3" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  offlineContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  offlineIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  radarLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  pulseCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: theme.colors.primary + "15",
    borderWidth: 2,
    borderColor: theme.colors.primary + "40",
  },
  pulseCircleOuter: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.primary + "10",
  },
  driverDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 5,
  },
  recenterButton: {
    position: "absolute",
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 30,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 10 },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  rideStackContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
  },
  cardWrapper: {
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default DriverHome;
