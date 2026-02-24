import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
// ✅ REANIMATED 3 IMPORTS
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { theme } from "../../../../constants/theme";
import { useRideBooking } from "../../../context/RideBookingContext";

/* -------------------------------------------------------------------------- */

const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey;
const { width, height } = Dimensions.get("window");

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 90,
  mass: 1,
};

/* -------------------------------------------------------------------------- */

interface MapContainerProps {
  trayHeight?: number;
  topPadding?: number;
  traySettled?: boolean;
}

type CameraMode = "user" | "route";

/* -------------------------------------------------------------------------- */

const MapContainer: React.FC<MapContainerProps> = ({
  trayHeight = 0,
  topPadding = 0,
  traySettled = true,
}) => {
  const mapRef = useRef<MapView>(null);
  const { rideData } = useRideBooking();
  const { pickupLocation, destination } = rideData;

  /* ------------------------- State & Refs ------------------------ */
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>("user");
  const [isMoved, setIsMoved] = useState(false);
  const [routeReady, setRouteReady] = useState(false);

  const animatingRef = useRef(false);

  // ✅ REANIMATED 3 SHARED VALUE
  const animatedBottomPadding = useSharedValue(trayHeight);
  const [currentBottomPadding, setCurrentBottomPadding] = useState(trayHeight);

  /* ---------------------- Sync tray animation -------------------- */

  // Update the shared value whenever trayHeight changes
  useEffect(() => {
    animatedBottomPadding.value = withSpring(
      trayHeight,
      SPRING_CONFIG,
      (finished) => {
        if (finished && traySettled) {
          runOnJS(animateCamera)();
        }
      },
    );
  }, [trayHeight, traySettled]);

  // MapView padding isn't a "Style" we can animate natively via SharedValue,
  // so we react to the animation and update the state for the MapView prop.
  useAnimatedReaction(
    () => animatedBottomPadding.value,
    (val) => {
      runOnJS(setCurrentBottomPadding)(val);
    },
  );

  /* ---------------------- Aspect Ratio -------------------------- */
  const usableHeight = height - trayHeight - topPadding;
  const aspectRatio = width / (usableHeight > 0 ? usableHeight : height);

  /* ---------------------- User Location ------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      if (!mounted) return;

      const latitudeDelta = 0.012;
      const longitudeDelta = latitudeDelta * aspectRatio;

      const region: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta,
        longitudeDelta,
      };

      setUserRegion(region);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [aspectRatio]);

  /* ---------------------- Camera Mode Sync --------------------------- */

  useEffect(() => {
    if (pickupLocation && destination) {
      setCameraMode("route");
    } else {
      setRouteReady(false);
      setCameraMode("user");
    }
  }, [pickupLocation, destination]);

  /* ---------------------- Animate Camera ------------------------ */
  const animateCamera = useCallback(() => {
    if (!mapRef.current || !traySettled || animatingRef.current) return;

    animatingRef.current = true;
    setRouteReady(false);

    if (cameraMode === "route" && pickupLocation && destination) {
      mapRef.current.fitToCoordinates(
        [
          {
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
          },
          { latitude: destination.latitude, longitude: destination.longitude },
        ],
        {
          edgePadding: {
            top: topPadding + 40,
            bottom: currentBottomPadding + 40,
            left: 40,
            right: 40,
          },
          animated: true,
        },
      );
    }

    if (cameraMode === "user" && userRegion) {
      mapRef.current.animateToRegion(userRegion, 800);
    }

    setTimeout(() => {
      animatingRef.current = false;
      if (cameraMode === "route" && pickupLocation && destination) {
        setRouteReady(true);
      }
    }, 600);
  }, [
    cameraMode,
    pickupLocation,
    destination,
    userRegion,
    topPadding,
    currentBottomPadding,
    traySettled,
  ]);

  /* ----------------------- Loading ----------------------------- */
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
        // ✅ Uses the state synced via useAnimatedReaction
        mapPadding={{
          top: topPadding,
          bottom: currentBottomPadding,
          left: 0,
          right: 0,
        }}
        onPanDrag={() => setIsMoved(true)}
      >
        {routeReady &&
          cameraMode === "route" &&
          pickupLocation &&
          destination && (
            <>
              <MapViewDirections
                origin={pickupLocation}
                destination={destination}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor={theme.colors.primary}
                precision="high"
              />
              <Marker coordinate={pickupLocation}>
                <View style={styles.premiumPickup}>
                  <View style={styles.pickupInner} />
                </View>
              </Marker>
              <Marker coordinate={destination}>
                <View style={styles.premiumDestination}>
                  <View style={styles.destinationInner} />
                </View>
              </Marker>
            </>
          )}
      </MapView>

      {isMoved && (
        <TouchableOpacity
          style={[styles.recenterButton, { bottom: currentBottomPadding + 20 }]}
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

/* ... styles and googleMapStyle remain the same ... */
/* ----------------------------- Styles ----------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  premiumPickup: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  pickupInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },

  premiumDestination: {
    width: 20,
    height: 20,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  destinationInner: {
    width: 8,
    height: 8,
    backgroundColor: "#fff",
  },

  recenterButton: {
    position: "absolute",
    right: 15,
    zIndex: 10,
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
