// app/driver/components/maps/DriverMap.tsx
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
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
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
}

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
}) => {
  const { rideData } = useRideBooking();
  const hasFitted = useRef(false);

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
  });

  useEffect(() => {
    const cleanup = watchDriverLocation(
      (location) => {
        // FIXED: Using type assertion (any) to bypass the strict property check
        // while maintaining the logic needed for AnimatedRegion
        animatedLocation
          .timing({
            toValue: {
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            duration: 1000,
            useNativeDriver: false,
          } as any)
          .start();

        setDriverMetadata({
          heading: location.heading ?? 0,
          speed: location.speed ?? 0,
        });

        // RESTORED: Dynamic Camera Zoom logic
        if (
          ["matched", "arrived", "on_trip"].includes(rideData?.status || "")
        ) {
          const speed = location.speed ?? 0;
          let targetZoom = 18; // Precise for slow speeds
          if (speed > 10) targetZoom = 17; // ~22mph
          if (speed > 20) targetZoom = 15; // ~45mph+

          mapRef.current?.animateCamera(
            {
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              heading: location.heading ?? 0,
              pitch: 45,
              zoom: targetZoom,
            },
            { duration: 1000 },
          );
        }
      },
      (err) => console.warn(err),
    );

    return () => cleanup();
  }, [animatedLocation, rideData?.status, showRecenter]);

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
  }, [rideData?.status, rideData?.activeTrip?.navigation?.polyline]);

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
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        loadingEnabled
        pitchEnabled={true}
        rotateEnabled={true}
      >
        <MarkerAnimated
          coordinate={animatedLocation as any} // Cast here as well if needed
          rotation={driverMetadata.heading}
          flat
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={15}
        >
          <View style={styles.markerContainer}>
            <MaterialCommunityIcons
              name="navigation"
              size={44}
              color={theme.colors.primary}
            />
          </View>
        </MarkerAnimated>

        {["matched", "arrived", "on_trip"].includes(rideData?.status || "") &&
          routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={5}
              strokeColor={theme.colors.primary}
            />
          )}
      </MapView>

      {!["matched", "arrived", "on_trip"].includes(rideData?.status || "") && (
        <View
          style={[styles.radarLayer, { top: 60, bottom: trayPadding }]}
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
      )}

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
            <View style={[styles.tooltipHead, { backgroundColor: "#fff" }]}>
              <Ionicons name="flag" size={18} color="#000" />
            </View>
            <View
              style={[
                styles.tooltipLine,
                { backgroundColor: "#000", height: 20 },
              ]}
            />
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
            <View style={[styles.tooltipHead, { backgroundColor: "#000" }]}>
              <Ionicons name="flag" size={16} color="#fff" />
            </View>
            <View
              style={[
                styles.tooltipLine,
                { backgroundColor: "#000", height: 20 },
              ]}
            />
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
          <Ionicons name="navigate" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // ... (rest of your styles are identical to previous version)
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
    elevation: 8,
    zIndex: 30,
  },
  dotPickup: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 20,
  },
  dotDropoff: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 50,
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
  },
  tooltipLine: {
    width: 2,
    marginBottom: 4,
  },
  tooltipHead: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    padding: 4,
  },
  markerContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default DriverMap;
