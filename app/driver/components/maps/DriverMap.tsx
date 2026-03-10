import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";

interface Props {
  mapRef: React.RefObject<MapView | null>;
  userRegion: any;
  trayPadding: number;
  pulseAnim: Animated.Value;
  showRecenter: boolean;
  onRecenter: () => void;
  onRegionChangeComplete: (region: Region) => void;
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
  return (
    <>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        mapPadding={{
          top: 60,
          right: 0,
          bottom: trayPadding,
          left: 0,
        }}
        initialRegion={userRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={onRegionChangeComplete}
        loadingEnabled
        pitchEnabled={false}
        rotateEnabled={false}
      />

      <View
        style={[
          styles.radarLayer,
          {
            top: 60,
            bottom: trayPadding,
          },
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

        <View style={styles.driverDot} />
      </View>

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
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 30,
  },
});

export default DriverMap;
