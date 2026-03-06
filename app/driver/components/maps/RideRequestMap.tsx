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

  const [mapReady, setMapReady] = useState(false); // ✅ ADD THIS
  const [isMoved, setIsMoved] = useState(false);
  const [positions, setPositions] = useState<{
    pickup: Point | null;
    dropoff: Point | null;
  }>({ pickup: null, dropoff: null });

  // --- 1. TOOLTIP POSITION SYNC ---
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

  // --- 2. FIT MAP TO ROUTE ---
  const fitToRoute = useCallback(() => {
    if (!mapRef.current || !rideData) return;

    const pointsToFit: LatLng[] = [
      rideData.pickup,
      rideData.destination,
      driverLocation,
      ...(Array.isArray(rideData.route?.coordinates)
        ? rideData.route.coordinates
        : []),
    ].filter(Boolean) as LatLng[];

    if (pointsToFit.length === 0) return;

    mapRef.current.fitToCoordinates(pointsToFit, {
      edgePadding: {
        top: topPadding + 40,
        bottom: trayHeight + 40,
        left: 60,
        right: 60,
      },
      animated: true,
    });

    setIsMoved(false);
  }, [rideData, driverLocation, topPadding, trayHeight]);

  const routeCoords = useMemo(() => {
    return Array.isArray(rideData?.route?.coordinates)
      ? rideData.route.coordinates
      : [];
  }, [rideData]);

  useEffect(() => {
    if (rideData && mapReady) {
      fitToRoute();
      syncTooltips();
    }
  }, [rideData, mapReady]);

  // --- 3. LOADING STATE ---
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
        onMapReady={() => setMapReady(true)} // ✅ ADD THIS
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPanDrag={() => setIsMoved(true)}
        onRegionChange={syncTooltips}
        onRegionChangeComplete={syncTooltips}
      >
        {/* Route Line */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={theme.colors.primary}
            strokeWidth={5}
            lineJoin="round"
          />
        )}

        {/* --- PREMIUM DRIVER MARKER --- */}
        {driverLocation && (
          <Marker coordinate={driverLocation} flat anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.premiumMarkerContainer}>
              <View style={styles.premiumBadge}>
                <MaterialCommunityIcons
                  name="car-sports" // Note the 's' at the end
                  size={18}
                  color="#FFF"
                />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Pickup dot */}
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

      {/* Dropoff dot */}
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

      {/* --- FLOATING TOOLTIPS --- */}

      {/* PICKUP TOOLTIP */}
      {positions.pickup && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.pickup.x, top: positions.pickup.y },
          ]}
        >
          <View
            style={[
              styles.tooltipBox,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text style={styles.tooltipTitle}>{"PICKUP"}</Text>
            <Text style={styles.tooltipValue}>
              {(rideData.distanceToPickup / 1000).toFixed(1)} km
              {" ("} {Math.ceil(rideData.etaToPickup / 60)} min
              {")"}
            </Text>
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

      {/* DROPOFF TOOLTIP */}
      {positions.dropoff && (
        <View
          style={[
            styles.tooltipAnchor,
            { left: positions.dropoff.x, top: positions.dropoff.y },
          ]}
        >
          <View
            style={[styles.tooltipBox, { backgroundColor: theme.colors.error }]}
          >
            <Text style={styles.tooltipTitle}>DROPOFF</Text>
            <Text style={styles.tooltipValue}>
              {rideData.route?.duration
                ? `${rideData.route.distance.toFixed(1)} km (${Math.ceil(rideData.route.duration)} min)`
                : "Calculating..."}
            </Text>
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
      {isMoved && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayHeight }]}
          onPress={fitToRoute}
        >
          <Ionicons name="navigate" size={20} color={theme.colors.primary} />
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
  // Premium Driver Styles
  premiumMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  premiumBadge: {
    width: 28,
    height: 28,
    borderRadius: 18,
    backgroundColor: "#001986", // Sleek black
    borderWidth: 2,
    borderColor: "#FFD700", // Gold border
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  premiumCrown: {
    position: "absolute",
    top: -8,
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  dotPickup: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7, // circle
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 20, // below tooltips
  },

  dotDropoff: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 0, // square
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 20,
  },
  tooltipAnchor: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    //zIndex: 100,
  },
  tooltipBox: {
    position: "absolute",
    bottom: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
    alignItems: "center",
    elevation: 6,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tooltipTitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tooltipValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  tooltipTriangle: {
    position: "absolute",
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  recenterButton: {
    position: "absolute",
    right: 15,
    padding: 10,
    elevation: 5,
  },
});

export default RideRequestMap;
