// app/passenger/components/map/MapContainer.tsx
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
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
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapView, { Polyline, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { theme } from "../../../../constants/theme";
import { useRideBooking } from "../../../context/RideBookingContext";
import { HEIGHTS } from "../tabs/Tray";

const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";
const { width, height } = Dimensions.get("window");

interface MapContainerProps {
  trayHeight?: number;
  topPadding?: number;
}

const MapContainer: React.FC<MapContainerProps> = ({
  trayHeight = 80,
  topPadding = 80,
}) => {
  const mapRef = useRef<MapView>(null);
  const { rideData, updateRideData, fetchPrices } = useRideBooking();
  const { pickupLocation, destination, status } = rideData;

  const [currentTrayHeight, setCurrentTrayHeight] = useState(trayHeight);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMoved, setIsMoved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedCoords, setAnimatedCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [snappedPoints, setSnappedPoints] = useState<{
    start: { latitude: number; longitude: number };
    end: { latitude: number; longitude: number };
  } | null>(null);

  const [positions, setPositions] = useState<{
    pickup: { x: number; y: number } | null;
    dropoff: { x: number; y: number } | null;
  }>({
    pickup: null,
    dropoff: null,
  });

  const TOP_LIMIT = height * 0.2;

  const STATUS_TO_TRAY_HEIGHT: Record<string, keyof typeof HEIGHTS> = {
    idle: "input",
    booking: "ride",
    searching: "searching",
    matched: "matched",
    arrived: "matched",
    on_trip: "matched",
    completed: "input",
  };

  // --- Reset on ride change ---
  useEffect(() => {
    setAnimatedCoords([]);
    setSnappedPoints(null);
    setRouteCoordinates([]);
    setPositions({ pickup: null, dropoff: null });
  }, [pickupLocation, destination]);

  // --- Update tray height based on ride status ---
  useEffect(() => {
    if (!status) return;
    const key = STATUS_TO_TRAY_HEIGHT[status];
    if (!key) return;
    const newHeight = HEIGHTS[key];
    if (newHeight !== currentTrayHeight) setCurrentTrayHeight(newHeight);
  }, [status, currentTrayHeight]);

  // --- Map padding to avoid overlays ---
  const getMapPadding = useCallback(
    () => ({
      top: TOP_LIMIT,
      bottom: currentTrayHeight,
      left: 0,
      right: 0,
    }),
    [currentTrayHeight],
  );

  // --- Track user location ---
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => {
          setUserRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012 * (width / height),
          });
          setLoading(false);
        },
      );
    };
    startTracking();
    return () => subscription?.remove();
  }, []);

  // --- Animate map camera to fit all points ---
  const animateCamera = useCallback(() => {
    if (!mapRef.current) return;

    const points: { latitude: number; longitude: number }[] = [];
    if (routeCoordinates.length > 0) {
      points.push(...routeCoordinates);
    } else {
      if (userRegion) points.push(userRegion);
      if (pickupLocation) points.push(pickupLocation);
      if (destination) points.push(destination);
    }

    if (points.length < 2) {
      if (points.length === 1) {
        mapRef.current.animateToRegion({
          ...points[0],
          latitudeDelta: 0.012,
          longitudeDelta: 0.012 * (width / height),
        });
      }
      return;
    }

    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 20, bottom: 40, left: 50, right: 50 },
      animated: true,
    });
  }, [userRegion, pickupLocation, destination, routeCoordinates]);

  useEffect(() => {
    const timeout = setTimeout(animateCamera, 150);
    return () => clearTimeout(timeout);
  }, [currentTrayHeight, animateCamera]);

  useEffect(() => {
    if (status && status !== "idle") animateCamera();
  }, [status, animateCamera]);

  // --- Convert coordinates to screen points for tooltips ---
  const syncTooltips = useCallback(async () => {
    if (!mapRef.current || !snappedPoints) return;

    const newPositions: any = { pickup: null, dropoff: null };
    newPositions.pickup = await mapRef.current.pointForCoordinate(
      snappedPoints.start,
    );
    newPositions.dropoff = await mapRef.current.pointForCoordinate(
      snappedPoints.end,
    );
    setPositions(newPositions);
  }, [snappedPoints]);

  // --- Animate route polyline ---
  const startRouteAnimation = useCallback((coords: any[]) => {
    const duration = 1200;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const visibleCount = Math.floor(progress * coords.length);
      setAnimatedCoords(coords.slice(0, Math.max(visibleCount, 2)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  // --- Directions component ---
  const directions = useMemo(() => {
    if (!pickupLocation || !destination || !GOOGLE_MAPS_APIKEY) return null;

    return (
      <MapViewDirections
        origin={pickupLocation}
        destination={destination}
        apikey={GOOGLE_MAPS_APIKEY}
        strokeWidth={0}
        precision="high"
        onReady={(result) => {
          const distanceText = `${result.distance.toFixed(1)} km`;
          const durationText = `${Math.ceil(result.duration)} min`;

          const start = result.coordinates[0];
          const end = result.coordinates[result.coordinates.length - 1];
          setSnappedPoints({ start, end });
          setRouteCoordinates(result.coordinates);

          updateRideData({
            distance: distanceText,
            duration: durationText,
            route: {
              coordinates: result.coordinates,
              distance: result.distance,
              duration: result.duration,
            },
          });

          fetchPrices(pickupLocation, destination, distanceText, durationText);
          startRouteAnimation(result.coordinates);

          setTimeout(syncTooltips, 150);
        }}
      />
    );
  }, [pickupLocation, destination, syncTooltips, startRouteAnimation]);

  // --- Check if markers and tooltips are ready ---
  const isRouteUIReady =
    !!snappedPoints &&
    !!positions.pickup &&
    !!positions.dropoff &&
    !!pickupLocation &&
    !!destination;

  if (loading || !userRegion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={userRegion}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={googleMapStyle}
        mapPadding={getMapPadding()}
        onPanDrag={() => setIsMoved(true)}
        onRegionChange={syncTooltips}
        onRegionChangeComplete={() => {
          setIsAnimating(false);
          syncTooltips();
        }}
      >
        {directions}

        {/* Animated polyline */}
        {animatedCoords.length > 1 && (
          <Polyline
            coordinates={animatedCoords}
            strokeWidth={4}
            strokeColor={theme.colors.black}
          />
        )}
      </MapView>

      {/* Pickup dot */}
      {isRouteUIReady && (
        <View
          style={[
            styles.dotPickup,
            {
              left: positions.pickup!.x - 7,
              top: positions.pickup!.y - 7,
            },
          ]}
        />
      )}

      {/* Dropoff dot */}
      {isRouteUIReady && (
        <View
          style={[
            styles.dotDropoff,
            {
              left: positions.dropoff!.x - 7,
              top: positions.dropoff!.y - 7,
            },
          ]}
        />
      )}

      {/* TOOLTIP: Pickup */}
      {isRouteUIReady && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.pickup!.x, top: positions.pickup!.y },
          ]}
        >
          <View
            style={[
              styles.tooltipBox,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.tooltipTitle}>Pickup</Text>
            {/*
            <View
              style={[
                styles.tooltipTriangle,
                { borderTopColor: theme.colors.primary },
              ]}
            />
            */}
          </View>
        </View>
      )}

      {/* TOOLTIP: Dropoff */}
      {isRouteUIReady && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.dropoff!.x, top: positions.dropoff!.y },
          ]}
        >
          <View
            style={[styles.tooltipBox, { backgroundColor: theme.colors.error }]}
          >
            <Text style={styles.tooltipTitle}>Dropoff</Text>
            {rideData?.duration ? (
              <Text style={styles.tooltipValue}>{rideData.duration}</Text>
            ) : (
              <View style={styles.loaderWrapper}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {/*
            <View
              style={[
                styles.tooltipTriangle,
                { borderTopColor: theme.colors.error },
              ]}
            />
            */}
          </View>
        </View>
      )}

      {/* RECENTER BUTTON */}
      {isMoved && !isAnimating && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: currentTrayHeight }]}
          onPress={() => {
            setIsMoved(false);
            animateCamera();
          }}
        >
          <Ionicons name="navigate" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  recenterButton: {
    position: "absolute",
    right: 15,
    padding: 5,
    elevation: 5,
  },
  dotPickup: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: "#000000",
    zIndex: 10, // below tooltips (zIndex 100)
  },
  dotDropoff: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 0, // square
    backgroundColor: "red",
    borderWidth: 2,
    borderColor: "#000000",
    zIndex: 10,
  },
  tooltipAnchor: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  tooltipBox: {
    position: "absolute",
    bottom: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 50,
    alignItems: "center",
    elevation: 4,
    minWidth: 70,
  },
  tooltipTitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tooltipValue: { color: "#fff", fontSize: 13, fontWeight: "800" },
  loaderWrapper: { height: 18, justifyContent: "center" },
  tooltipTriangle: {
    position: "absolute",
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

const googleMapStyle = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#d5e1e9" }],
  },
];

export default MapContainer;
