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
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
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
        // Responsively calculated padding
        top: topPadding + vs(45),
        bottom: trayHeight + vs(20),
        left: s(30),
        right: s(30),
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
            { color: theme.colors.textSecondary, marginTop: vs(10) },
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
            strokeWidth={ms(5)}
            lineJoin="round"
          />
        )}

        {/* --- GOOGLE NAVIGATION DRIVER MARKER --- */}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            flat
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverLocation.heading || 0}
          >
            <View style={styles.navMarkerContainer}>
              <View style={styles.navMarkerCircle}>
                <MaterialCommunityIcons
                  name="navigation"
                  size={ms(22)}
                  color={theme.colors.primary}
                  style={{ transform: [{ translateY: vs(-1) }] }}
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
        </View>
      )}

      {/* Pickup & Dropoff Dots */}
      {positions.pickup && (
        <View
          style={[
            styles.dotPickup,
            {
              left: positions.pickup.x - s(7),
              top: positions.pickup.y - s(7),
            },
          ]}
        />
      )}

      {positions.dropoff && (
        <View
          style={[
            styles.dotDropoff,
            {
              left: positions.dropoff.x - s(7),
              top: positions.dropoff.y - s(7),
            },
          ]}
        />
      )}

      {isMoved && (
        <TouchableOpacity
          style={[
            styles.recenterButton,
            { bottom: trayHeight + vs(20), right: s(20) },
          ]}
          onPress={fitToRoute}
        >
          <Ionicons
            name="navigate"
            size={ms(20)}
            color={theme.colors.secondary}
          />
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
    width: s(45),
    height: s(45),
    borderRadius: ms(18),
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
    width: s(14),
    height: s(14),
    borderRadius: ms(14),
    backgroundColor: theme.colors.primary,
    borderWidth: 1.5,
    borderColor: "#ffffff",
    zIndex: 20,
  },
  dotDropoff: {
    position: "absolute",
    width: s(14),
    height: s(14),
    borderRadius: ms(14),
    backgroundColor: theme.colors.red,
    borderWidth: 1.5,
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
    width: s(64),
    height: s(64),
    borderWidth: 1.5,
    borderRadius: ms(50),
    borderColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    padding: s(4),
    marginBottom: vs(12),
  },
  tooltipValue1: {
    fontSize: ms(15),
    fontWeight: "900",
    textAlign: "center",
  },
  tooltipValue2: {
    fontSize: ms(11),
    fontWeight: "600",
    textAlign: "center",
  },
  navMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  navMarkerCircle: {
    width: s(32),
    height: s(32),
    borderRadius: ms(30),
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  recenterButton: {
    position: "absolute",
    backgroundColor: "#fff",
    padding: s(12),
    borderRadius: ms(30),
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default RideRequestMap;
