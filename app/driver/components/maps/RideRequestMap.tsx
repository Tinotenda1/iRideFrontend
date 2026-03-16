// app/driver/components/maps/RideRequestMap.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  LatLng,
  Marker,
  Point,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { theme } from "../../../../constants/theme";

// Types
import polyline from "@mapbox/polyline";
import { DriverLocation } from "../../driverLocationUtility/driverLocation";

interface Props {
  rideData: any;
  driverLocation?: DriverLocation | null;
  trayHeight?: number;
  topPadding?: number;
  minHeight: number;
}

const RideRequestMap: React.FC<Props> = ({
  rideData,
  driverLocation,
  trayHeight = 0,
  topPadding = 0,
  minHeight,
}) => {
  const mapRef = useRef<MapView>(null);

  const [mapReady, setMapReady] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [positions, setPositions] = useState<{
    pickup: Point | null;
    dropoff: Point | null;
  }>({ pickup: null, dropoff: null });

  const syncTooltips = useCallback(async () => {
    if (!mapRef.current || !mapReady || !rideData) return;

    try {
      const newPositions = {
        pickup: null as Point | null,
        dropoff: null as Point | null,
      };

      if (rideData.pickup) {
        newPositions.pickup = await mapRef.current.pointForCoordinate(
          rideData.pickup,
        );
      }

      if (rideData.destination) {
        newPositions.dropoff = await mapRef.current.pointForCoordinate(
          rideData.destination,
        );
      }

      setPositions(newPositions);
    } catch (err) {
      console.warn("Tooltip sync failed:", err);
    }
  }, [rideData, mapReady]);

  const routeCoords = useMemo(() => {
    if (!rideData?.route?.polyline) return [];

    try {
      return polyline.decode(rideData.route.polyline).map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
      }));
    } catch (err) {
      console.warn("Failed to decode polyline:", err);
      return [];
    }
  }, [rideData?.route?.polyline]);

  const fitToRoute = useCallback(() => {
    if (!mapRef.current || !rideData) return;

    const pointsToFit: LatLng[] = [
      rideData.pickup,
      rideData.destination,
      driverLocation,
      ...routeCoords,
    ].filter(Boolean) as LatLng[];

    if (pointsToFit.length === 0) return;

    mapRef.current.fitToCoordinates(pointsToFit, {
      edgePadding: {
        // Increased top padding to ensure the 65px Tooltip Head fits
        top: topPadding + 45,
        bottom: trayHeight + 20,
        left: 30,
        right: 30,
      },
      animated: true,
    });

    setIsMoved(false);
  }, [rideData, driverLocation, routeCoords, topPadding, trayHeight]);

  useEffect(() => {
    if (rideData && mapReady) {
      fitToRoute();
      syncTooltips();
    }
  }, [rideData, mapReady]);

  if (!rideData || !rideData.pickup) {
    return (
      <View style={[styles.center, { minHeight }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[
            theme.typography.caption as TextStyle,
            { color: theme.colors.textSecondary, marginTop: 10 },
          ]}
        >
          Initializing route...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPanDrag={() => setIsMoved(true)}
        onRegionChange={syncTooltips}
        onRegionChangeComplete={syncTooltips}
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={"#000"}
            strokeWidth={5}
            lineJoin="round"
          />
        )}

        {/* --- GOOGLE NAVIGATION DRIVER MARKER --- */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            flat // Makes the marker lay flat on the map for perspective
            anchor={{ x: 0.5, y: 0.5 }} // Rotates around the exact center
            rotation={driverLocation.heading || 0} // Uses heading for direction
          >
            <View style={styles.navMarkerContainer}>
              <View style={styles.navMarkerCircle}>
                <MaterialCommunityIcons
                  name="navigation" // Navigation chevron icon
                  size={22}
                  color={theme.colors.primary}
                  style={{ transform: [{ translateY: -1 }] }} // Centers the icon visually
                />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* --- PICKUP TOOLTIP --- */}
      {positions.pickup && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.pickup.x, top: positions.pickup.y },
          ]}
        >
          {/* Circle Head */}
          <View
            style={[
              styles.tooltipHead,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={[styles.tooltipValue1, { color: "#ffffff" }]}>
              {(rideData.distanceToPickup / 1000).toFixed(1)} km
            </Text>
            <Text style={[styles.tooltipValue2, { color: "#ffffff" }]}>
              {Math.ceil(rideData.etaToPickup / 60)} min
            </Text>
          </View>
          {/* Line Connector */}
        </View>
      )}

      {/* --- DROPOFF TOOLTIP --- */}
      {positions.dropoff && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.dropoff.x, top: positions.dropoff.y },
          ]}
        >
          {/* Circle Head */}
          <View
            style={[styles.tooltipHead, { backgroundColor: theme.colors.red }]}
          >
            <Text style={[styles.tooltipValue1, { color: "#fff" }]}>
              {rideData.route?.duration
                ? `${rideData.route.distance.toFixed(1)} km`
                : "..."}
            </Text>
            <Text style={[styles.tooltipValue2, { color: "#fff" }]}>
              {rideData.route?.duration
                ? `${Math.ceil(rideData.route.duration)} min`
                : "..."}
            </Text>
          </View>
          {/* Line Connector */}
        </View>
      )}

      {/* Pickup & Dropoff Dots */}
      {positions.pickup && (
        <View
          style={[
            styles.dotPickup,
            {
              left: positions.pickup.x - 7,
              top: positions.pickup.y - 7,
            },
          ]}
        />
      )}

      {positions.dropoff && (
        <View
          style={[
            styles.dotDropoff,
            {
              left: positions.dropoff.x - 7,
              top: positions.dropoff.y - 7,
            },
          ]}
        />
      )}

      {isMoved && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayHeight }]}
          onPress={fitToRoute}
        >
          <Ionicons name="navigate" size={20} color={theme.colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  premiumMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  premiumBadge: {
    width: 45,
    height: 45,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dotPickup: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  dotDropoff: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 50,
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
    justifyContent: "flex-end", // grows upwards from marker
  },

  tooltipHead: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderRadius: 50,
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    padding: 4,
    marginBottom: 12,
  },
  tooltipValue1: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  tooltipValue2: {
    fontSize: 12,
    fontWeight: "200",
    textAlign: "center",
  },
  navMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  navMarkerCircle: {
    width: 30,
    height: 30,
    borderRadius: 18,
    backgroundColor: "#ffffff", // Google Blue
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    // Adding shadow for depth
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  recenterButton: {
    position: "absolute",
    elevation: 5,
  },
});

export default RideRequestMap;
