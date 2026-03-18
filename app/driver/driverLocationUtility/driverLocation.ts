// app/driver/driverLocationUtility/driverLocation.ts
import * as Location from "expo-location";
import { getDriverSocket } from "../socketConnectionUtility/driverSocketService";

/**
 * Represents a driver's GPS location with accuracy metadata
 */
export type DriverLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null; // Accuracy in meters (null if unavailable)
  speed: number | null; // Speed in meters/second (null if unavailable)
  heading: number | null; // Bearing/heading in degrees (null if unavailable)
  timestamp: number; // Unix timestamp in milliseconds
  altitude?: number; // Altitude in meters (optional)
};

// Constants for logic
const MIN_ACCURACY = 20; // Meters
const UI_ACCURACY_THRESHOLD = 100; // Looser for UI to prevent freezing
const MOVEMENT_THRESHOLD = 0.00002; // Approx 2 meters in lat/lng

// Internal tracking variables
let lastLat: number | null = null;
let lastLon: number | null = null;
let lastKnownHeading = 0;
let lastLocationSentAt = 0;
let watchId: Location.LocationSubscription | null = null;

const watchOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 1, // Update every meter
};

// Bearing formula: calculates angle between two points
const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

/**
 * Location request configuration
 */
const LOCATION_CONFIG = {
  accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy for drivers
  timeout: 15000, // 15 second timeout
  maximumAge: 5000, // Accept cached location up to 5 seconds old
} as const;

/**
 * Error types for better error handling
 */
export type LocationError =
  | "PERMISSION_DENIED"
  | "LOCATION_UNAVAILABLE"
  | "TIMEOUT"
  | "GPS_DISABLED"
  | "UNKNOWN_ERROR";

/**
 * Result wrapper for consistent error handling
 */
export type LocationResult =
  | { success: true; location: DriverLocation }
  | { success: false; error: LocationError; message: string };

/**
 * Checks if location services are enabled on the device
 */
const checkLocationServices = async (): Promise<boolean> => {
  try {
    const enabled = await Location.hasServicesEnabledAsync();
    return enabled;
  } catch {
    return false;
  }
};

/**
 * Requests location permissions with detailed error handling
 */
const requestLocationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status === "granted") return true;

    const res = await Location.requestForegroundPermissionsAsync();

    return res.status === "granted";
  } catch (error) {
    console.warn("Location permission request failed:", error);
    return false;
  }
};

/**
 * Validates location data for completeness and reasonable accuracy
 */
const validateLocation = (location: Location.LocationObject): boolean => {
  const { coords } = location;

  // Check for valid coordinates
  if (coords.latitude == null || coords.longitude == null) {
    return false;
  }

  // Check if coordinates are valid numbers
  if (isNaN(coords.latitude) || isNaN(coords.longitude)) {
    return false;
  }

  // Check for reasonable coordinate ranges
  if (Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180) {
    return false;
  }

  // Optional: Check accuracy if available
  if (coords.accuracy != null && coords.accuracy > 100) {
    console.warn(`Location accuracy is poor: ${coords.accuracy}m`);
  }

  return true;
};

/**
 * Formats raw location data into standardized DriverLocation object
 */
const formatDriverLocation = (
  location: Location.LocationObject,
): DriverLocation => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy: location.coords.accuracy ?? null,
  speed: location.coords.speed ?? null,
  heading: location.coords.heading ?? null,
  timestamp: location.timestamp,
  altitude: location.coords.altitude ?? undefined,
});

/**
 * Main function to fetch driver's current location with reliability features
 * @returns LocationResult with either success data or detailed error
 */
export const getDriverLocation = async (): Promise<LocationResult> => {
  try {
    // Step 1: Check if location services are enabled
    const servicesEnabled = await checkLocationServices();
    if (!servicesEnabled) {
      return {
        success: false,
        error: "GPS_DISABLED",
        message: "Please enable location services on your device",
      };
    }

    // Step 2: Request permissions
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: "PERMISSION_DENIED",
        message: "Location permission is required for driver functionality",
      };
    }

    // Step 3: Fetch current location with timeout
    const location = await Location.getCurrentPositionAsync(LOCATION_CONFIG);

    // Step 4: Validate the received location
    if (!validateLocation(location)) {
      return {
        success: false,
        error: "LOCATION_UNAVAILABLE",
        message: "Unable to fetch valid location data",
      };
    }

    // Step 5: Format and return successful result
    return {
      success: true,
      location: formatDriverLocation(location),
    };
  } catch (error) {
    // Handle specific error types
    console.error("Location fetch error:", error);

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return {
          success: false,
          error: "TIMEOUT",
          message: "Location request timed out. Please try again",
        };
      }
    }

    // Fallback: Try to get last known location
    try {
      const lastLocation = await Location.getLastKnownPositionAsync();
      if (lastLocation && validateLocation(lastLocation)) {
        console.info("Using last known location as fallback");
        return {
          success: true,
          location: formatDriverLocation(lastLocation),
        };
      }
    } catch (fallbackError) {
      console.warn("Fallback location also failed:", fallbackError);
    }

    return {
      success: false,
      error: "UNKNOWN_ERROR",
      message: "Unable to determine your current location",
    };
  }
};

/**
 * Watch driver location with accuracy filtering and stable heading
 */
export const watchDriverLocation = (
  callback: (location: DriverLocation) => void,
  errorCallback?: (error: string) => void,
) => {
  const startWatching = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        errorCallback?.("PERMISSION_DENIED");
        return;
      }

      watchId = await Location.watchPositionAsync(watchOptions, (loc) => {
        const { coords, timestamp } = loc;

        // 1. Filter out poor GPS data
        if (coords.accuracy == null || coords.accuracy > UI_ACCURACY_THRESHOLD)
          return;

        // 2. Vector-based Heading Logic (Movement only)
        if (lastLat !== null && lastLon !== null) {
          const distanceMoved = Math.sqrt(
            Math.pow(coords.latitude - lastLat, 2) +
              Math.pow(coords.longitude - lastLon, 2),
          );

          // Only calculate new heading if the driver has actually moved
          if (distanceMoved > MOVEMENT_THRESHOLD) {
            const newBearing = calculateBearing(
              lastLat,
              lastLon,
              coords.latitude,
              coords.longitude,
            );

            // Smooth the rotation (LERP)
            // 0.4 means 40% of the new angle is applied each update
            const delta = newBearing - lastKnownHeading;
            const normalizedDelta = ((delta + 180) % 360) - 180;
            lastKnownHeading =
              (lastKnownHeading + normalizedDelta * 0.4 + 360) % 360;
          }
        }

        // Update history
        lastLat = coords.latitude;
        lastLon = coords.longitude;

        const formatted: DriverLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: lastKnownHeading,
          accuracy: coords.accuracy,
          speed: coords.speed,
          timestamp,
        };

        // 3. Update UI (Map Marker)
        callback(formatted);

        // 4. Update Server (Throttled)
        const now = Date.now();
        const isAccurateEnoughForServer = coords.accuracy <= MIN_ACCURACY;

        if (isAccurateEnoughForServer && now - lastLocationSentAt >= 1000) {
          lastLocationSentAt = now;
          const socket = getDriverSocket();
          if (socket?.connected) {
            socket.emit("driver:location_update", formatted);
          }
        }
      });
    } catch (err) {
      console.error("Location Watch Error:", err);
      errorCallback?.("UNKNOWN_ERROR");
    }
  };

  startWatching();

  return () => {
    if (watchId) {
      watchId.remove();
      watchId = null;
    }
  };
};

/**
 * Calculates distance between two coordinates in meters (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Checks if location is within acceptable accuracy threshold
 */
export const isLocationAccurate = (
  location: DriverLocation,
  maxAccuracy = 50,
): boolean => {
  return location.accuracy != null && location.accuracy <= maxAccuracy;
};
