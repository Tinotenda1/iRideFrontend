// app/driver/screens/DriverHome.tsx
import { theme } from "@/constants/theme";
import { notifyRideEvent } from "@/utils/persistentNotification";
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import DriverMap from "../components/maps/DriverMap";
import RideRequestCard from "../components/RideRequestCard";
import {
  onRemoveRideRequest,
  onRideNoLongerAvailable,
} from "../socketConnectionUtility/driverSocketService";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RideState {
  rideId: string;
  broadcastType: "priority" | "other";
  expiresAt: number;
  data: any;
}

interface Props {
  online: boolean;
  manuallyOffline?: boolean;
  setManuallyOffline?: (value: boolean) => void;
  isConnecting: boolean;
  incomingRides?: any[];
  submittedOffers: { [rideId: string]: number };
  onRideSelect: (
    rideId: string,
    priorityDurationMs: number,
    remainingMs: number,
    rideData: any,
  ) => void;
  onRideExpire: (ride: any) => void;
  trayPadding: number;
  rideTrayRef: React.RefObject<any>;
  isOnline: boolean;
}

const DEFAULT_EXPIRE_TIME = 10000;

const DriverHome: React.FC<Props> = ({
  rideTrayRef,
  online,
  manuallyOffline,
  setManuallyOffline,
  isConnecting,
  incomingRides = [],
  submittedOffers,
  onRideSelect,
  onRideExpire,
  trayPadding,
  isOnline,
}) => {
  const [rides, setRides] = useState<RideState[]>([]);
  const lastProcessedRidesRef = useRef<Set<string>>(new Set());

  const mapRef = useRef<MapView>(null);
  const [userRegion, setUserRegion] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [showRecenter, setShowRecenter] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Initialize manuallyOffline as true

  // Only clear manuallyOffline once driver is fully connected
  useEffect(() => {
    if (online && !isConnecting) {
      setManuallyOffline?.(false);
    }
  }, [online, isConnecting]);

  /* ---------------- Load Location ---------------- */

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

  /* ---------------- Process Incoming Rides ---------------- */

  useEffect(() => {
    if (!incomingRides || incomingRides.length === 0) {
      setRides([]);
      lastProcessedRidesRef.current.clear();
      return;
    }

    const currentRideIds = new Set(incomingRides.map((r) => r.rideId));
    const newRides: RideState[] = [];

    const processRides = async () => {
      for (const ride of incomingRides) {
        if (!lastProcessedRidesRef.current.has(ride.rideId)) {
          const expiresIn = ride.expiresIn || DEFAULT_EXPIRE_TIME;

          if (AppState.currentState !== "active") {
            const pickupDistanceKm = (ride.distanceToPickup / 1000).toFixed(1);
            const tripDistanceKm = ride.route?.distance?.toFixed(1) ?? "N/A";

            await notifyRideEvent(
              `Drift - New Ride (${ride.vehicleType})`,
              `Pickup: ${pickupDistanceKm} km • Trip: ${tripDistanceKm} km • Offer: $${ride.offer}`,
              {
                sound: "ride_request.wav",
                color: theme.colors.standardNotification,
              },
            );
          }

          newRides.push({
            rideId: ride.rideId,
            broadcastType: ride.broadcastType || "other",
            expiresAt: Date.now() + expiresIn,
            data: ride,
          });

          lastProcessedRidesRef.current.add(ride.rideId);
        }
      }

      setRides((prev) => {
        const filtered = prev.filter((r) => currentRideIds.has(r.rideId));
        const updated = filtered.map((r) => {
          const data = incomingRides.find((i) => i.rideId === r.rideId);
          return data ? { ...r, data } : r;
        });

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        return [...updated, ...newRides];
      });

      lastProcessedRidesRef.current.forEach((id) => {
        if (!currentRideIds.has(id)) {
          lastProcessedRidesRef.current.delete(id);
        }
      });
    };

    processRides();
  }, [incomingRides]);

  /* ---------------- Radar Animation ---------------- */

  const reversedRides = useMemo(() => [...rides].reverse(), [rides]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation;

    if (online && !isConnecting) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
    } else if (isConnecting) {
      pulseAnim.setValue(1);
    }

    return () => animation?.stop();
  }, [online, isConnecting]);

  /* ---------------- Handlers ---------------- */

  const handleCardSelect = useCallback(
    (
      rideId: string,
      rideData: any,
      priorityDurationMs: number,
      remainingMs: number,
    ) => {
      onRideSelect(rideId, rideData, priorityDurationMs, remainingMs);
    },
    [onRideSelect],
  );

  const handleCardExpire = useCallback(
    (rideId: string) => {
      const ride = rides.find((r) => r.rideId === rideId);
      if (ride) onRideExpire(ride.data);
    },
    [rides],
  );

  const handleRecenter = () => {
    if (userRegion && mapRef.current) {
      mapRef.current.animateToRegion(userRegion, 800);
      setShowRecenter(false);
    }
  };

  const onRegionChangeComplete = (region: Region) => {
    if (!userRegion) return;

    const lat = Math.abs(region.latitude - userRegion.latitude);
    const lng = Math.abs(region.longitude - userRegion.longitude);

    if (lat > 0.001 || lng > 0.001) {
      setShowRecenter(true);
    } else {
      setShowRecenter(false);
    }
  };

  /* ---------------- Socket Cleanup ---------------- */

  useEffect(() => {
    const unsub = onRemoveRideRequest((data) => {
      const id = data?.rideId;
      if (!id) return;

      setRides((prev) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        return prev.filter((r) => r.rideId !== id);
      });

      lastProcessedRidesRef.current.delete(id);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onRideNoLongerAvailable((data) => {
      const id = data?.rideId;
      if (!id) return;

      setRides((prev) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        return prev.filter((r) => r.rideId !== id);
      });

      lastProcessedRidesRef.current.delete(id);
    });

    return () => unsub();
  }, []);

  /* ---------------- Offline / Network Status ---------------- */
  if (manuallyOffline) {
    // Only show full offline UI if user intentionally went offline
    return (
      <View style={[styles.offlineContainer]}>
        <View style={styles.offlineIcon}>
          <Ionicons name="moon-outline" size={ms(60)} color="#94a3b8" />
        </View>
      </View>
    );
  }

  /* ---------------- Loading ---------------- */

  if (mapLoading || !userRegion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  /* ---------------- Main ---------------- */

  return (
    <View style={styles.container}>
      <DriverMap
        mapRef={mapRef}
        userRegion={userRegion}
        trayPadding={trayPadding}
        pulseAnim={pulseAnim}
        showRecenter={showRecenter}
        onRecenter={handleRecenter}
        onRegionChangeComplete={onRegionChangeComplete}
        isOnline={online}
      />

      {rides.length > 0 && (
        <View
          style={[
            styles.rideStackContainer,
            {
              top: vs(10),
              bottom: vs(160),
            },
          ]}
          pointerEvents="box-none"
        >
          <FlatList
            data={reversedRides}
            keyExtractor={(item) => item.rideId}
            renderItem={({ item }) => (
              <View style={[styles.cardWrapper, { overflow: "visible" }]}>
                <RideRequestCard
                  rideId={item.rideId}
                  rideData={item.data}
                  expiresAt={item.expiresAt}
                  submittedOffer={submittedOffers[item.rideId]}
                  onSelect={handleCardSelect}
                  onExpire={handleCardExpire}
                  rideTrayRef={rideTrayRef}
                />
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: s(16) }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f3f3" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  offlineContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },

  offlineIcon: {
    width: s(100),
    height: s(100),
    borderRadius: ms(100),
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: vs(20),
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
    width: s(250),
    height: s(250),
    borderRadius: ms(125),
    backgroundColor: theme.colors.primary + "15",
    borderWidth: 2,
    borderColor: theme.colors.primary + "40",
  },

  pulseCircleOuter: {
    position: "absolute",
    width: s(320),
    height: s(320),
    borderRadius: ms(160),
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.primary + "10",
  },

  driverDot: {
    position: "absolute",
    width: s(20),
    height: s(20),
    borderRadius: ms(10),
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 5,
  },

  recenterButton: {
    position: "absolute",
    right: s(16),
    width: s(50),
    height: s(50),
    borderRadius: ms(25),
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: ms(5),
    elevation: 8,
    zIndex: 30,
  },

  title: {
    fontSize: ms(24),
    fontWeight: "800",
    color: "#fff",
    marginTop: vs(10),
  },

  subtitle: {
    fontSize: ms(15),
    color: "#94a3b8",
    textAlign: "center",
    marginTop: vs(8),
    paddingHorizontal: s(40),
  },

  rideStackContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
  },

  cardWrapper: {
    marginBottom: vs(12),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: ms(10),
    elevation: 5,
  },
});

export default DriverHome;
