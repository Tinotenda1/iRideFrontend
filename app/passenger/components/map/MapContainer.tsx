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
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import polyline from "@mapbox/polyline";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { theme } from "../../../../constants/theme";
import { useRideBooking } from "../../../context/RideBookingContext";
import { HEIGHTS } from "../tabs/Tray";

const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";
const { width, height } = Dimensions.get("window");

const CAR_ICON = require("../../../../assets/icons/car-icon.png");

interface MapContainerProps {
  trayHeight?: number;
  topPadding?: number;
  nearbyDrivers?: {
    phone: string;
    latitude: number;
    longitude: number;
    distance?: string;
    heading?: number;
  }[];
  matchedDriver?: {
    phone: string;
    latitude: number;
    longitude: number;
    heading?: number;
  } | null;
}

const MapContainer: React.FC<MapContainerProps> = ({
  trayHeight = 80,
  topPadding = 80,
  nearbyDrivers = [],
  matchedDriver = null,
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
    on_trip: "on_trip",
    completed: "input",
  };

  useEffect(() => {
    setAnimatedCoords([]);
    setSnappedPoints(null);
    setRouteCoordinates([]);
    setPositions({ pickup: null, dropoff: null });
  }, [pickupLocation, destination]);

  useEffect(() => {
    if (!mapRef.current) return;

    const id = requestAnimationFrame(() => {
      animateCamera();
    });

    return () => cancelAnimationFrame(id);
  }, [status]);

  useEffect(() => {
    if (!status) return;
    const key = STATUS_TO_TRAY_HEIGHT[status];
    if (!key) return;
    const newHeight = HEIGHTS[key];
    if (newHeight !== currentTrayHeight) setCurrentTrayHeight(newHeight);
  }, [status, currentTrayHeight]);

  const getMapPadding = useCallback(
    () => ({
      top: TOP_LIMIT,
      bottom: currentTrayHeight,
      left: 0,
      right: 0,
    }),
    [currentTrayHeight],
  );

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

  const animateCamera = useCallback(() => {
    if (!mapRef.current) return;

    const points: { latitude: number; longitude: number }[] = [];

    if (status === "matched" && matchedDriver && pickupLocation) {
      points.push(
        {
          latitude: Number(matchedDriver.latitude),
          longitude: Number(matchedDriver.longitude),
        },
        {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
        },
      );

      mapRef.current.fitToCoordinates(points, {
        edgePadding: {
          top: vs(100),
          bottom: currentTrayHeight + vs(40),
          left: s(80),
          right: s(80),
        },
        animated: true,
      });
    } else if (status === "on_trip" && matchedDriver && destination) {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: Number(matchedDriver.latitude),
            longitude: Number(matchedDriver.longitude),
          },
          heading: matchedDriver.heading ?? 0,
          pitch: 45,
          zoom: 17,
        },
        { duration: 1000 },
      );
    } else {
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
        edgePadding: { top: vs(20), bottom: vs(40), left: s(50), right: s(50) },
        animated: true,
      });
    }
  }, [
    userRegion,
    pickupLocation,
    destination,
    routeCoordinates,
    status,
    matchedDriver,
    currentTrayHeight,
  ]);

  useEffect(() => {
    if (
      (status === "matched" || status === "on_trip") &&
      matchedDriver &&
      !isMoved
    ) {
      animateCamera();
    }
  }, [
    matchedDriver?.latitude,
    matchedDriver?.longitude,
    matchedDriver?.heading,
    status,
    isMoved,
    animateCamera,
  ]);

  useEffect(() => {
    const timeout = setTimeout(animateCamera, 150);
    return () => clearTimeout(timeout);
  }, [currentTrayHeight, animateCamera]);

  useEffect(() => {
    if (status && status !== "idle") animateCamera();
  }, [status, animateCamera]);

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

          const encodedPolyline = polyline.encode(
            result.coordinates.map((c) => [c.latitude, c.longitude]),
          );

          updateRideData({
            distance: distanceText,
            duration: durationText,
            route: {
              polyline: encodedPolyline,
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

  const isRouteUIReady =
    !!snappedPoints &&
    !!positions.pickup &&
    !!positions.dropoff &&
    !!pickupLocation &&
    !!destination;

  if (loading || !userRegion) {
    return null;
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

        {animatedCoords.length > 1 && (
          <Polyline
            coordinates={animatedCoords}
            strokeWidth={ms(5)}
            strokeColor={theme.colors.secondary}
          />
        )}
        {status !== "matched" &&
          status !== "on_trip" &&
          nearbyDrivers.map((driver) => (
            <Marker
              key={driver.phone}
              coordinate={{
                latitude: Number(driver.latitude),
                longitude: Number(driver.longitude),
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={driver.heading ?? 0}
            >
              <Image
                source={require("../../../../assets/icons/car-icon.png")}
                style={{ width: ms(32), height: ms(32) }}
                resizeMode="contain"
              />
            </Marker>
          ))}
        {(status === "matched" || status === "on_trip") && matchedDriver && (
          <Marker
            key={`matched-${matchedDriver.phone}`}
            coordinate={{
              latitude: Number(matchedDriver.latitude),
              longitude: Number(matchedDriver.longitude),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={matchedDriver.heading ?? 0}
          >
            <Image
              source={require("../../../../assets/icons/car-icon.png")}
              style={{ width: ms(36), height: ms(36) }}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>

      {isRouteUIReady && (
        <View
          style={[
            styles.dotPickup,
            {
              left: positions.pickup!.x - ms(7),
              top: positions.pickup!.y - ms(7),
            },
          ]}
        />
      )}

      {isRouteUIReady && (
        <View
          style={[
            styles.dotDropoff,
            {
              left: positions.dropoff!.x - ms(7),
              top: positions.dropoff!.y - ms(7),
            },
          ]}
        />
      )}

      {isRouteUIReady && (
        <>
          {positions.pickup && (
            <View
              style={[
                styles.tooltipAnchor,
                { left: positions.pickup.x, top: positions.pickup.y },
              ]}
            >
              <View
                style={[
                  styles.tooltipHead,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={{
                    fontSize: ms(16),
                    fontWeight: "700",
                    color: "#fff",
                  }}
                >
                  A
                </Text>
              </View>
            </View>
          )}

          {positions.dropoff && (
            <View
              style={[
                styles.tooltipAnchor,
                { left: positions.dropoff.x, top: positions.dropoff.y },
              ]}
            >
              <View
                style={[
                  styles.tooltipHead,
                  { backgroundColor: theme.colors.red },
                ]}
              >
                <View>
                  <Text
                    style={{
                      fontSize: ms(16),
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    B
                  </Text>
                </View>
                <Text style={[styles.tooltipValue2, { color: "#fff" }]}>
                  {rideData.route?.duration
                    ? `${Math.ceil(rideData.route.duration)} min`
                    : "..."}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      {isMoved && !isAnimating && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: currentTrayHeight }]}
          onPress={() => {
            setIsMoved(false);
            animateCamera();
          }}
        >
          <Ionicons
            name="navigate"
            size={ms(28)}
            color={theme.colors.secondary}
          />
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
    right: s(15),
    padding: ms(3),
    marginBottom: vs(10),
    elevation: 5,
  },
  dotPickup: {
    position: "absolute",
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  dotDropoff: {
    position: "absolute",
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
    backgroundColor: theme.colors.red,
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  tooltipAnchor: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tooltipHead: {
    width: ms(45),
    height: ms(45),
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: ms(25),
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: ms(3),
    padding: ms(4),
    marginBottom: vs(12),
  },
  tooltipValue1: {
    fontSize: ms(12),
    fontWeight: "600",
    textAlign: "center",
  },
  tooltipValue2: {
    fontSize: ms(10),
    fontWeight: "400",
    textAlign: "center",
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
