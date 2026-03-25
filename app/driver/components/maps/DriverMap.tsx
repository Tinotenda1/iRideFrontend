// app/passenger/components/DriverMap.tsx
import { useRideBooking } from "@/app/context/RideBookingContext";
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive"; // Using your utility
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
  const hasAutoCenteredOnTrip = useRef(false);
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

  // FIXED: Removed the 800ms auto-center loop that was causing the "jumping"
  // The camera is now driven solely by the driver location watcher below.

  // Inside useEffect where watchDriverLocation is called

  useEffect(() => {
    const cleanup = watchDriverLocation(
      (location) => {
        // Smoothly animate the marker
        markerRef.current?.animateMarkerToCoordinate(
          {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          1000,
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

        const now = Date.now();
        const currentStatus = rideData?.status || "";

        // Define Navigation Mode
        const isNavigating = ["matched", "arrived", "on_trip"].includes(
          currentStatus,
        );

        // Reset the one-time trigger if the trip ends or resets
        if (currentStatus !== "on_trip") {
          hasAutoCenteredOnTrip.current = false;
        }

        // Logic: Force a recenter if we just entered 'on_trip'
        // OR follow normally if the user hasn't panned away
        const forceRecenter =
          currentStatus === "on_trip" && !hasAutoCenteredOnTrip.current;

        if (
          forceRecenter ||
          (!showRecenter && now - lastCameraUpdate.current > 2000)
        ) {
          if (forceRecenter) {
            hasAutoCenteredOnTrip.current = true;
            onRecenter(); // Syncs the parent state (showRecenter = false)
          }

          lastCameraUpdate.current = now;

          const speed = location.speed ?? 0;
          let targetZoom = isNavigating ? (speed > 20 ? 17 : 19) : 18;

          mapRef.current?.animateCamera(
            {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              heading: isNavigating ? (location.heading ?? 0) : 0,
              pitch: isNavigating ? 45 : 0,
              zoom: targetZoom,
            },
            { duration: forceRecenter ? 1000 : 2000 },
          );
        }
      },
      (err) => console.warn("Driver Location Watch Error:", err),
    );

    return () => cleanup();
  }, [animatedLocation, rideData?.status, showRecenter, onRecenter]);

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
        edgePadding: {
          top: vs(120),
          right: s(60),
          bottom: vs(250),
          left: s(60),
        },
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
        mapPadding={{
          top: vs(60),
          right: 0,
          bottom: trayPadding,
          left: 0,
        }}
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
        {traveledCoordinates.length > 1 && (
          <Polyline
            coordinates={traveledCoordinates}
            strokeColor="#A0A0A0"
            strokeWidth={s(8)}
            zIndex={2}
          />
        )}

        {["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
          routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={s(8)}
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
              size={ms(25)}
              color={theme.colors.primary}
            />
          </View>
        </MarkerAnimated>
      </MapView>

      <View
        style={[
          styles.radarLayer,
          { top: vs(60), bottom: trayPadding, opacity: showRadar ? 1 : 0 },
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
                left: tooltipPositions.pickup!.x - s(7),
                top: tooltipPositions.pickup!.y - vs(7),
              },
            ]}
          />
          <View
            style={[
              styles.dotDropoff,
              {
                left: tooltipPositions.dropoff!.x - s(7),
                top: tooltipPositions.dropoff!.y - vs(7),
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
              <Text style={styles.tooltipText}>Pickup</Text>
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
              <Text style={styles.tooltipText}>Dropoff</Text>
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
          bottom: trayPadding + vs(10),
          alignSelf: "center",
          zIndex: 50,
        }}
      />

      {showRecenter && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: trayPadding + vs(10) }]}
          onPress={onRecenter}
        >
          <Ionicons
            name="navigate"
            size={ms(28)}
            color={theme.colors.secondary}
          />
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
    width: s(250),
    height: s(250),
    borderRadius: ms(300),
    backgroundColor: theme.colors.primary + "15",
    borderWidth: s(2),
    borderColor: theme.colors.primary + "40",
  },
  pulseCircleOuter: {
    position: "absolute",
    width: s(320),
    height: s(320),
    borderRadius: ms(300),
    backgroundColor: "transparent",
    borderWidth: s(1),
    borderColor: theme.colors.primary + "10",
  },
  recenterButton: {
    position: "absolute",
    right: s(16),
    width: s(50),
    height: s(50),
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 30,
  },
  dotPickup: {
    position: "absolute",
    width: s(14),
    height: s(14),
    borderRadius: ms(20),
    backgroundColor: theme.colors.primary,
    borderWidth: s(2),
    borderColor: "#ffffff",
    zIndex: 20,
  },
  dotDropoff: {
    position: "absolute",
    width: s(14),
    height: s(14),
    borderRadius: ms(20),
    backgroundColor: theme.colors.red,
    borderWidth: s(2),
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
    width: s(70),
    height: s(35),
    borderWidth: s(1.5),
    borderRadius: ms(20),
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    padding: s(4),
    marginBottom: vs(15),
  },
  tooltipText: {
    fontSize: ms(12),
    fontWeight: "700",
    color: "#fff",
  },
  markerContainer: {
    position: "absolute",
    alignItems: "center",
    borderWidth: s(2),
    borderColor: theme.colors.primary,
    borderRadius: ms(50),
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: s(2),
  },
});

export default React.memo(DriverMap);
