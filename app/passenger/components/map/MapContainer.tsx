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

import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { theme } from "../../../../constants/theme";
import { useRideBooking } from "../../../context/RideBookingContext";

const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";
const { width, height } = Dimensions.get("window");

interface MapContainerProps {
  trayHeight?: number;
  topPadding?: number;
}

const MapContainer: React.FC<MapContainerProps> = ({
  trayHeight = 0,
  topPadding = 0,
}) => {
  const mapRef = useRef<MapView>(null);
  const { rideData, updateRideData, fetchPrices } = useRideBooking();
  const { pickupLocation, destination, status } = rideData;

  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMoved, setIsMoved] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lockedPadding, setLockedPadding] = useState(trayHeight);

  const [snappedPoints, setSnappedPoints] = useState<{
    start: { latitude: number; longitude: number };
    end: { latitude: number; longitude: number };
  } | null>(null);

  // Tracks screen coordinates for both tooltips
  const [positions, setPositions] = useState<{
    pickup: { x: number; y: number } | null;
    dropoff: { x: number; y: number } | null;
  }>({ pickup: null, dropoff: null });

  useEffect(() => {
    setSnappedPoints(null);
    setPositions({ pickup: null, dropoff: null });
  }, [pickupLocation, destination]);

  /* ------------------- TOOLTIP POSITION SYNCHRONIZER ------------------- */
  const syncTooltips = useCallback(async () => {
    if (!mapRef.current) return;

    const startCoord = snappedPoints?.start || pickupLocation;
    const endCoord = snappedPoints?.end || destination;

    const newPositions: { pickup: any; dropoff: any } = {
      pickup: null,
      dropoff: null,
    };

    if (startCoord) {
      newPositions.pickup = await mapRef.current.pointForCoordinate(startCoord);
    }
    if (endCoord) {
      newPositions.dropoff = await mapRef.current.pointForCoordinate(endCoord);
    }

    setPositions(newPositions);
  }, [pickupLocation, destination, snappedPoints]);

  const animateCamera = useCallback(() => {
    if (!mapRef.current) return;
    const start = snappedPoints?.start || pickupLocation;
    const end = snappedPoints?.end || destination;

    if (start && end) {
      const latDelta = Math.abs(start.latitude - end.latitude) * 1.5;
      const lngDelta = Math.abs(start.longitude - end.longitude) * 1.5;

      mapRef.current.animateToRegion(
        {
          latitude: (start.latitude + end.latitude) / 2,
          longitude: (start.longitude + end.longitude) / 2,
          latitudeDelta: latDelta || 0.012,
          longitudeDelta: lngDelta || 0.012,
        },
        800,
      );
    } else if (userRegion) {
      mapRef.current.animateToRegion(userRegion, 800);
    }
  }, [pickupLocation, destination, snappedPoints, userRegion]);

  useEffect(() => {
    if (!status) return;
    if (
      [
        "booking",
        "searching",
        "matched",
        "arrived",
        "on_trip",
        "completed",
      ].includes(status)
    ) {
      animateCamera();
    }
  }, [status, animateCamera]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status: locStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      if (!mounted) return;

      setUserRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012 * (width / height),
      });
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------ MEMOIZED ROUTE & MARKERS ----------------------- */
  const directions = useMemo(() => {
    if (!pickupLocation || !destination || !GOOGLE_MAPS_APIKEY) return null;

    return (
      <>
        <MapViewDirections
          origin={pickupLocation}
          destination={destination}
          apikey={GOOGLE_MAPS_APIKEY}
          strokeWidth={4}
          strokeColor={theme.colors.primary}
          precision="high"
          onReady={(result) => {
            const distanceText = `${result.distance.toFixed(1)} km`;
            const durationText = `${Math.ceil(result.duration)} min`;

            const start = result.coordinates[0];
            const end = result.coordinates[result.coordinates.length - 1];

            setSnappedPoints({ start, end });

            // ✅ SAVE ROUTE IN CONTEXT
            updateRideData({
              distance: distanceText,
              duration: durationText,

              route: {
                coordinates: result.coordinates,
                distance: result.distance,
                duration: result.duration,
              },
            });

            // 🚀 Fetch prices
            if (pickupLocation && destination) {
              fetchPrices(
                pickupLocation,
                destination,
                distanceText,
                durationText,
              );
            }

            setTimeout(syncTooltips, 150);
          }}
        />
        <Marker
          coordinate={snappedPoints?.start || pickupLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.staticDotStart} />
        </Marker>
        <Marker
          coordinate={snappedPoints?.end || destination}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.staticDotEnd} />
        </Marker>
      </>
    );
  }, [pickupLocation, destination, snappedPoints, syncTooltips]);

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
        mapPadding={{
          top: topPadding,
          bottom: lockedPadding + 70,
          left: 0,
          right: 0,
        }}
        onPanDrag={() => setIsMoved(true)}
        onRegionChange={syncTooltips}
        onRegionChangeComplete={() => {
          setIsAnimating(false);
          syncTooltips();
        }}
      >
        {directions}
      </MapView>

      {/* --------------------- FLOATING TOOLTIPS --------------------- */}

      {/* PICKUP TOOLTIP */}
      {positions.dropoff && pickupLocation && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.pickup?.x, top: positions.pickup?.y },
          ]}
        >
          <View
            style={[
              styles.tooltipBox,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.tooltipTitle}>Pickup</Text>
            <View
              style={[
                styles.tooltipTriangle,
                { borderTopColor: theme.colors.primary },
              ]}
            />
          </View>
        </View>
      )}

      {/* DROPOFF TOOLTIP */}
      {positions.dropoff && destination && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.dropoff.x, top: positions.dropoff.y },
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
            <View
              style={[
                styles.tooltipTriangle,
                { borderTopColor: theme.colors.error },
              ]}
            />
          </View>
        </View>
      )}

      {isMoved && !isAnimating && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayHeight }]}
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
    //zIndex: 10,
    //backgroundColor: "#fff",
    padding: 5,
    elevation: 5,
  },
  staticDotStart: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
  },
  staticDotEnd: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: "#fff",
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
    bottom: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
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
