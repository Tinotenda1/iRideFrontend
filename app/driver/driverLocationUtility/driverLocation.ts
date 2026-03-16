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
  errorCallback?: (error: LocationError) => void,
): (() => void) => {
  const watchOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 1, // every 1 meter
    timeInterval: 500, // every 0.5 second
    mayShowUserSettingsDialog: true,
  };

  let watchId: Location.LocationSubscription | null = null;
  let lastLocationSentAt = 0;
  let lastKnownHeading = 0;

  const MIN_ACCURACY = 20; // meters
  const MIN_SPEED_FOR_HEADING = 0.5; // m/s, below this consider stationary

  const startWatching = async () => {
    try {
      // 1. Check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        errorCallback?.("PERMISSION_DENIED");
        return;
      }

      // 2. Start watching with high-accuracy navigation options
      watchId = await Location.watchPositionAsync(watchOptions, (loc) => {
        const { coords, timestamp } = loc;

        // --- LOGIC GATE: UI vs SERVER ---
        // We allow a looser accuracy for the UI (e.g., 100m) so the marker doesn't "freeze"
        // but keep MIN_ACCURACY strict for the backend updates.
        const UI_ACCURACY_THRESHOLD = 100;
        if (coords.accuracy == null || coords.accuracy > UI_ACCURACY_THRESHOLD)
          return;

        // 3. Speed-based heading stabilization
        if (coords.speed != null && coords.heading != null) {
          if (coords.speed >= MIN_SPEED_FOR_HEADING) {
            // INITIAL FIX: If this is our first heading, don't smooth it (prevents slow spinning at start)
            if (lastKnownHeading === 0) {
              lastKnownHeading = coords.heading;
            } else {
              // Smooth heading change
              const delta = coords.heading - lastKnownHeading;
              const normalizedDelta = ((delta + 180) % 360) - 180;
              lastKnownHeading =
                (lastKnownHeading + normalizedDelta * 0.3 + 360) % 360;
            }
          }
        }

        const formatted: DriverLocation = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          heading: lastKnownHeading,
          accuracy: coords.accuracy,
          speed: coords.speed ?? 0,
          timestamp,
        };

        // 4. UPDATE UI IMMEDIATELY
        // This ensures the marker moves on the map regardless of status
        callback(formatted);

        // 5. THROTTLED BACKEND UPDATES
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
      console.error("Failed to watch location:", err);
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
