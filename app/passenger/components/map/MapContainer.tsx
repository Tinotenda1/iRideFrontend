// components/map/MapContainer.tsx
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MapView from 'react-native-maps';

// Define MarkerData interface
export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

interface MapContainerProps {
  trayHeight?: number;
}

const MapContainer: React.FC<MapContainerProps> = ({ trayHeight = 0 }) => {
  const mapRef = useRef<MapView>(null);

  const [userRegion, setUserRegion] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  // -----------------------------------------------------
  // LOAD USER LOCATION ON MOUNT
  // -----------------------------------------------------
  useEffect(() => {
    const loadLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };

      setUserRegion(region);
      setLoading(false);
    };

    loadLocation();
  }, []);


  // -----------------------------------------------------
  // Loading UI
  // -----------------------------------------------------
  if (loading || !userRegion) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // -----------------------------------------------------
  // MAIN RENDER
  // -----------------------------------------------------
  return (
    <View style={{ flex: 1 }}>

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={userRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        loadingEnabled={true}
        onMapReady={() => setLoading(false)}
      >
      </MapView>
    </View>
  );
};

export default MapContainer;
