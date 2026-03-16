import { useRideBooking } from "@/app/context/RideBookingContext";
import { theme } from "@/constants/theme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import polyline from "@mapbox/polyline";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  AnimatedRegion,
  MarkerAnimated,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import ExternalNavButton from "../../../../components/ExternalNavButton";
import { watchDriverLocation } from "../../driverLocationUtility/driverLocation";

interface Props {
  mapRef: React.RefObject<MapView | null>;
  userRegion: Region;
  trayPadding: number;
  pulseAnim: Animated.Value;
  showRecenter: boolean;
  onRecenter: () => void;
  onRegionChangeComplete: (region: Region) => void;
  isOnline: boolean;
}

// Helper to find the index of the coordinate closest to the driver
const findClosestIndex = (
  coords: { latitude: number; longitude: number }[],
  driverLoc: { latitude: number; longitude: number },
) => {
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const distance = Math.sqrt(
      Math.pow(coords[i].latitude - driverLoc.latitude, 2) +
        Math.pow(coords[i].longitude - driverLoc.longitude, 2),
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  return closestIndex;
};

function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

const DriverMap: React.FC<Props> = ({
  mapRef,
  userRegion,
  trayPadding,
  pulseAnim,
  showRecenter,
  onRecenter,
  onRegionChangeComplete,
  isOnline,
}) => {
  const { rideData } = useRideBooking();
  const hasFitted = useRef(false);
  const lastCameraUpdate = useRef(0);
  const lastAutoCenter = useRef(0);
  const markerRef = useRef<React.ComponentRef<typeof MarkerAnimated> | null>(
    null,
  );

  const [animatedLocation] = useState(
    new AnimatedRegion({
      latitude: userRegion.latitude,
      longitude: userRegion.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }),
  );

  const [driverMetadata, setDriverMetadata] = useState({
    heading: 0,
    speed: 0,
    latitude: userRegion.latitude,
    longitude: userRegion.longitude,
  });

  useEffect(() => {
    const now = Date.now();
    if (now - lastAutoCenter.current > 800) {
      lastAutoCenter.current = now;
      setTimeout(() => {
        onRecenter();
      }, 200);
    }
  }, [rideData?.status, trayPadding, onRecenter]);

  useEffect(() => {
    const cleanup = watchDriverLocation(
      (location) => {
        markerRef.current?.animateMarkerToCoordinate(
          {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          3000,
        );
        animatedLocation.setValue({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });

        setDriverMetadata({
          heading: location.heading ?? 0,
          speed: location.speed ?? 0,
          latitude: location.latitude,
          longitude: location.longitude,
        });

        const speed = location.speed ?? 0;
        let targetZoom = speed > 20 ? 15 : speed > 10 ? 17 : 18;

        const now = Date.now();
        if (now - lastCameraUpdate.current > 1200) {
          lastCameraUpdate.current = now;

          mapRef.current?.animateCamera(
            {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              heading: location.heading ?? 0,
              pitch: ["matched", "arrived", "on_trip"].includes(
                rideData?.status || "",
              )
                ? 45
                : 0,
              zoom: targetZoom,
            },
            { duration: 1500 },
          );
        }
      },
      (err) => console.warn(err),
    );

    return () => cleanup();
  }, [animatedLocation, rideData?.status]);

  const pickupCoord = useMemo(() => {
    if (rideData?.activeTrip?.ride?.pickup) {
      return {
        latitude: rideData.activeTrip.ride.pickup.lat,
        longitude: rideData.activeTrip.ride.pickup.lng,
      };
    }
    return null;
  }, [rideData?.activeTrip?.ride?.pickup]);

  const dropoffCoord = useMemo(() => {
    if (rideData?.activeTrip?.ride?.destination) {
      return {
        latitude: rideData.activeTrip.ride.destination.lat,
        longitude: rideData.activeTrip.ride.destination.lng,
      };
    }
    return null;
  }, [rideData?.activeTrip?.ride?.destination]);

  const routeCoordinates = useMemo(() => {
    if (
      ["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
      rideData?.activeTrip?.navigation?.polyline
    ) {
      return polyline
        .decode(rideData.activeTrip.navigation.polyline)
        .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    }
    return [];
  }, [rideData?.activeTrip?.navigation?.polyline]);

  // 2. TRAVELED PATH LOGIC: Grays out the route behind the driver
  const traveledCoordinates = useMemo(() => {
    if (routeCoordinates.length === 0) return [];
    const index = findClosestIndex(routeCoordinates, driverMetadata);
    return routeCoordinates.slice(0, index + 1);
  }, [routeCoordinates, driverMetadata]);

  const [tooltipPositions, setTooltipPositions] = useState<{
    pickup?: { x: number; y: number };
    dropoff?: { x: number; y: number };
  }>({});

  const syncTooltips = useCallback(async () => {
    if (!mapRef.current || !pickupCoord || !dropoffCoord) return;
    try {
      const [pickupPoint, dropoffPoint] = await Promise.all([
        mapRef.current.pointForCoordinate(pickupCoord),
        mapRef.current.pointForCoordinate(dropoffCoord),
      ]);
      if (pickupPoint && dropoffPoint) {
        setTooltipPositions({ pickup: pickupPoint, dropoff: dropoffPoint });
      }
    } catch (err) {
      console.warn("Failed to sync tooltips:", err);
    }
  }, [mapRef, pickupCoord, dropoffCoord]);

  const throttledSync = useCallback(throttle(syncTooltips, 16), [syncTooltips]);

  useEffect(() => {
    if (
      ["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
      pickupCoord &&
      dropoffCoord
    ) {
      syncTooltips();
    }
  }, [rideData?.status, pickupCoord, dropoffCoord, syncTooltips]);

  useEffect(() => {
    if (
      ["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
      routeCoordinates.length > 0 &&
      !hasFitted.current
    ) {
      hasFitted.current = true;
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 120, right: 60, bottom: 200, left: 60 },
        animated: true,
      });
      setTimeout(syncTooltips, 500);
    }
    return () => {
      if (!["matched", "arrived", "on_trip"].includes(rideData?.status || "")) {
        hasFitted.current = false;
      }
    };
  }, [rideData?.status, routeCoordinates]);

  const handleRegionChange = (region: Region) => throttledSync();
  const handleRegionChangeComplete = (region: Region) => {
    onRegionChangeComplete(region);
    syncTooltips();
  };

  const showTooltips =
    ["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
    pickupCoord &&
    dropoffCoord &&
    tooltipPositions.pickup &&
    tooltipPositions.dropoff;

  const showRadar = !["matched", "arrived", "on_trip"].includes(
    rideData?.status || "",
  );

  return (
    <>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        mapPadding={{ top: 60, right: 0, bottom: trayPadding, left: 0 }}
        initialRegion={userRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        moveOnMarkerPress={false}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        loadingEnabled
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Traveled Path (Gray) */}
        {traveledCoordinates.length > 1 && (
          <Polyline
            coordinates={traveledCoordinates}
            strokeColor="#A0A0A0"
            strokeWidth={8}
            zIndex={2}
          />
        )}

        {/* Remaining Route (Blue) */}
        {["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
          routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={8}
              strokeColor={theme.colors.secondary}
              zIndex={1}
            />
          )}

        <MarkerAnimated
          ref={markerRef}
          coordinate={animatedLocation as any}
          rotation={driverMetadata.heading}
          flat
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={15}
        >
          <View style={styles.markerContainer}>
            <MaterialCommunityIcons
              name="navigation"
              size={25}
              color={theme.colors.primary}
            />
          </View>
        </MarkerAnimated>
      </MapView>

      <View
        style={[
          styles.radarLayer,
          { top: 60, bottom: trayPadding, opacity: showRadar ? 1 : 0 },
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
      </View>

      {showTooltips && (
        <>
          <View
            style={[
              styles.dotPickup,
              {
                left: tooltipPositions.pickup!.x - 7,
                top: tooltipPositions.pickup!.y - 7,
              },
            ]}
          />
          <View
            style={[
              styles.dotDropoff,
              {
                left: tooltipPositions.dropoff!.x - 7,
                top: tooltipPositions.dropoff!.y - 7,
              },
            ]}
          />

          <View
            style={[
              styles.tooltipAnchor,
              {
                left: tooltipPositions.pickup!.x,
                top: tooltipPositions.pickup!.y,
              },
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
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Pickup
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.tooltipAnchor,
              {
                left: tooltipPositions.dropoff!.x,
                top: tooltipPositions.dropoff!.y,
              },
            ]}
          >
            <View
              style={[
                styles.tooltipHead,
                { backgroundColor: theme.colors.red },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                Dropoff
              </Text>
            </View>
          </View>
        </>
      )}

      <ExternalNavButton
        status={rideData?.status}
        pickup={pickupCoord}
        destination={dropoffCoord}
        style={{
          position: "absolute",
          bottom: trayPadding + 10,
          alignSelf: "center",
          zIndex: 50,
        }}
      />

      {showRecenter && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayPadding }]}
          onPress={onRecenter}
        >
          <Ionicons name="navigate" size={28} color={theme.colors.secondary} />
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
  recenterButton: {
    position: "absolute",
    right: 16,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 30,
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
    justifyContent: "flex-end",
  },
  tooltipHead: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderRadius: 50,
    borderColor: "#fff",
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
  markerContainer: {
    position: "absolute",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 50,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 2,
  },
});

export default React.memo(DriverMap);
