// components/map/MapContainer.tsx
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Place } from './LocationSearch';

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

  const [destination, setDestination] = useState('');
  const [markers, setMarkers] = useState<MarkerData[]>([]);

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
  // When user selects a place from search
  // -----------------------------------------------------
  const handlePlaceSelect = (place: Place | null) => {
    if (place) {
      markLocationOnMap(place.latitude, place.longitude, place.name);

      // Camera zoom to that point
      mapRef.current?.animateToRegion(
        {
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        400
      );
    }
  };

  // -----------------------------------------------------
  // Drop marker on map
  // -----------------------------------------------------
  const markLocationOnMap = (latitude: number, longitude: number, title: string) => {
    const newMarker: MarkerData = {
      id: `marker-${Date.now()}`,
      latitude,
      longitude,
      title,
      description: 'Selected location',
    };

    setMarkers([newMarker]);
  };

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
        {/* Render markers */}
        {markers.map(marker => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
          />
        ))}
      </MapView>
    </View>
  );
};

export default MapContainer;
