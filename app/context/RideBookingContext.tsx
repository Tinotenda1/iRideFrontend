// app/context/RideBookingContext.tsx

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert } from "react-native";
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { Place } from "../passenger/components/map/LocationSearch";
import { getPassengerSocket } from "../passenger/socketConnectionUtility/passengerSocketService";

export interface RideBookingData {
  rideId?: string;
  passengerPhone: string;
  pickupLocation: Place | null;
  destination: Place | null;
  vehicleType: string;
  paymentMethod: string;
  additionalInfo?: string;
  offer?: number;
  offerType?: "poor" | "fair" | "good";
  vehiclePrices?: Record<string, number>;
  recentDestinations?: Place[];

  pickup?: any;
  passenger?: any;
  driver?: any;
  vehicle?: any;
  fare?: number;
  startedAt?: string;
  arrivedAt?: string;

  status?:
    | "idle"
    | "searching"
    | "matched"
    | "arrived"
    | "on_trip"
    | "completed"
    | "on_rating"
    | "active"
    | "welcome"
    | "online";
  activeTrip?: any;
  requests?: any[];
}

export interface RideResponse {
  rideId: string;
  status: string;
  pickup?: any;
  destination?: any;
  vehicleType?: string;
  offer?: number;
  offerType?: string;
  paymentMethod?: string;
  timestamp?: string;
  additionalInfo?: string;

  // This is the structure appearing in your logs after reload
  tripDetails?: {
    offer: number;
    passenger: {
      id?: number;
      name: string;
      phone: string;
      profilePic?: string;
      rating?: string | number;
      totalRides?: number; // Used in Passenger logs
      totalTrips?: number; // Used in Driver logs
    };
    driver?: {
      id?: number;
      name: string;
      phone: string;
      rating: string | number;
      profilePic?: string;
      totalTrips?: number;
      vehicle: {
        model: string;
        color: string;
        licensePlate: string;
        pic: string;
        year?: number;
      };
    };
    ride: {
      pickup: any;
      destination: any;
      pickupAddress: string;
      destinationAddress: string;
      vehicleType: string;
      paymentMethod: string;
      additionalInfo?: string;
    };
    vehicle?: {
      model: string;
      color: string;
      licensePlate: string;
      pic: string;
      year?: number;
    };
  };

  // Optional flat mapping for backward compatibility with TripTab.tsx
  passenger?: {
    id: number;
    name: string;
    phone: string;
    profilePic?: string;
    rating?: number;
    totalTrips?: number;
  };
  driver?: {
    name: string;
    phone: string;
    rating: number | string;
    profilePic?: string;
    totalTrips?: number;
    vehicle: {
      model: string;
      color: string;
      licensePlate: string;
      pic: string;
    };
  };
}

interface RideBookingContextType {
  rideData: RideBookingData;
  loading: boolean;
  error: string | null;
  currentRide: RideResponse | null;
  updateRideData: (updates: Partial<RideBookingData>) => void;
  setCurrentRide: (ride: RideResponse | null) => void;
  clearRideData: () => void;
  submitRideBooking: () => Promise<RideResponse>;
  cancelRide: () => Promise<void>;
  fetchRecentDestinations: () => Promise<void>;
  hideRecentDestination: (rideId: string) => Promise<void>;
  fetchPrices: (pickup: Place, destination: Place) => Promise<void>;
}

const RideBookingContext = createContext<RideBookingContextType | undefined>(
  undefined,
);

const initialRideData: RideBookingData = {
  passengerPhone: "",
  pickupLocation: null,
  destination: null,
  vehicleType: "",
  paymentMethod: "",
  additionalInfo: "",
  offer: 0,
  offerType: "fair",
  vehiclePrices: {},
  recentDestinations: [],
  status: "idle",
  activeTrip: null,
};

export const RideBookingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [rideData, setRideData] = useState<RideBookingData>(initialRideData);
  const [currentRide, setCurrentRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasResumedRef = useRef(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Log status changes for debugging
  useEffect(() => {
    const prev = prevStatusRef.current;
    const current = rideData.status;

    if (prev !== current) {
      console.log(
        `[RideBookingContext] Status changed: ${prev ?? "none"} → ${current}`,
      );
    }

    prevStatusRef.current = current;
  }, [rideData.status]);

  const updateRideData = useCallback((updates: Partial<RideBookingData>) => {
    setRideData((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearRideData = useCallback(() => {
    hasResumedRef.current = false;
    setRideData(initialRideData);
    setCurrentRide(null);
    setError(null);
    setLoading(false);
  }, []);

  const fetchPrices = useCallback(
    async (pickup: Place, destination: Place) => {
      const MAX_RETRIES = 3;

      if (!pickup.latitude || !destination.latitude) return;
      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 400)); // 400ms delay

      let attempt = 0;
      let success = false;

      while (attempt <= MAX_RETRIES && !success) {
        try {
          const response = await api.post("/pricing/suggest", {
            pickup: { latitude: pickup.latitude, longitude: pickup.longitude },
            destination: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          });

          /*
          // Force failure for testing
          throw new Error("Simulated API failure");
          */

          if (response.data && response.data.suggestions) {
            const priceMap: Record<string, number> = {};
            response.data.suggestions.forEach((item: any) => {
              priceMap[item.vehicleType] = item.suggestedPrice;
            });

            console.log("[Context] Prices mapped successfully:", priceMap);
            updateRideData({ vehiclePrices: priceMap });
            success = true;
          } else {
            throw new Error("No suggestions returned");
          }
        } catch (err) {
          attempt++;
          console.error(
            `❌ Failed to fetch price estimates (Attempt ${attempt}):`,
            err,
          );

          // Wait 500ms before retrying
          if (attempt <= MAX_RETRIES)
            await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (!success) {
        console.warn(
          "⚠️ Price fetch failed after all retries, clearing destination.",
        );
        updateRideData({ destination: null, vehiclePrices: {} });

        // Optional: navigate user back to input tab & show alert
        Alert.alert(
          "Price Fetch Failed",
          "Unable to fetch prices. Please make sure you have an active internet connection and try again.",
          [{ text: "OK" }],
        );
      }
    },
    [updateRideData],
  );

  const submitRideBooking = useCallback(async (): Promise<RideResponse> => {
    if (loading) return Promise.reject("Request already in progress");

    const MAX_RETRIES = 3;
    let attempt = 0;

    try {
      setLoading(true);
      setError(null);

      const userInfo = await getUserInfo();
      if (!userInfo?.phone) throw new Error("User phone not found");

      const bookingData = {
        passengerPhone: userInfo.phone,

        pickup: {
          latitude: Number(rideData.pickupLocation?.latitude),
          longitude: Number(rideData.pickupLocation?.longitude),
          address: rideData.pickupLocation?.address || "",
        },

        destination: {
          latitude: Number(rideData.destination?.latitude),
          longitude: Number(rideData.destination?.longitude),
          address: rideData.destination?.address || "",
        },

        vehicleType: rideData.vehicleType,
        paymentMethod: rideData.paymentMethod,
        additionalInfo: rideData.additionalInfo || "",
        offer: Number(rideData.offer) || 0,
        offerType: rideData.offerType || "fair",
      };

      while (attempt < MAX_RETRIES) {
        attempt++;

        try {
          console.log(`🚗 Submitting ride request (Attempt ${attempt})...`);

          const response = await api.post("/rides/request", bookingData);

          if (!response.data?.success) {
            throw new Error(response.data?.message || "Ride request failed");
          }

          // Save active ride
          setCurrentRide(response.data.ride);

          // Join socket room
          if (response.data.ride?.rideId) {
            getPassengerSocket()?.emit("ride:join_room", {
              rideId: response.data.ride.rideId,
            });
          }

          console.log("✅ Ride request successful");

          return response.data.ride;
        } catch (err: any) {
          console.error(`❌ Ride request failed (Attempt ${attempt})`, err);

          // If last attempt → throw
          if (attempt >= MAX_RETRIES) {
            throw err;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      throw new Error("Ride request failed after retries");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "We couldn’t complete your booking right now. Please try again.",
      );

      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading, rideData]);

  const cancelRide = useCallback(async () => {
    if (loading) return Promise.reject("Request already in progress");

    const MAX_RETRIES = 3;
    let attempt = 0;

    try {
      setLoading(true);

      const userInfo = await getUserInfo();
      if (!userInfo?.phone || !currentRide?.rideId) {
        throw new Error("Missing user or ride information");
      }

      while (attempt < MAX_RETRIES) {
        attempt++;

        try {
          console.log(`🛑 Cancelling ride (Attempt ${attempt})...`);

          await api.post("/rides/cancel", {
            passengerPhone: userInfo.phone,
            rideId: currentRide.rideId,
          });

          console.log("✅ Ride cancelled successfully");

          // Clear local state immediately
          setCurrentRide(null);
          updateRideData({ status: "idle", activeTrip: null });

          return;
        } catch (err) {
          console.error(`❌ Cancel failed (Attempt ${attempt})`, err);

          if (attempt >= MAX_RETRIES) {
            throw err;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error("❌ Failed to cancel trip after retries:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading, currentRide?.rideId, updateRideData]);

  const fetchRecentDestinations = useCallback(async () => {
    if (loading) return;

    const MAX_RETRIES = 3;
    const AUTO_RETRY_DELAY = 10000; // 10 seconds

    let attempt = 0;
    let success = false;

    if (!rideData.recentDestinations?.length) {
      setLoading(true);
    }

    try {
      const userInfo = await getUserInfo();
      if (!userInfo?.phone) return;

      const cleanPhone = userInfo.phone.replace(/\+/g, "").trim();

      /* ============================
       Primary Retry Loop
    ============================ */
      while (attempt < MAX_RETRIES && !success) {
        attempt++;

        try {
          console.log(
            `📍 Fetching recent destinations (Attempt ${attempt})...`,
          );

          const response = await api.get(
            `/rides/recent-destinations?phone=${cleanPhone}`,
          );

          if (!response.data?.success) {
            throw new Error("Invalid response");
          }

          updateRideData({
            recentDestinations: response.data.destinations,
          });

          console.log("✅ Recent destinations loaded");

          success = true;
          return;
        } catch (err) {
          console.error(
            `❌ Recent destinations failed (Attempt ${attempt})`,
            err,
          );

          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }

      /* ============================
       Auto Background Retry
    ============================ */

      console.warn("⚠️ Will auto-retry recent destinations in background...");

      setTimeout(() => {
        console.log("🔄 Auto-retrying recent destinations...");
        fetchRecentDestinations();
      }, AUTO_RETRY_DELAY);
    } finally {
      setLoading(false);
    }
  }, [loading, rideData.recentDestinations, updateRideData]);

  const hideRecentDestination = useCallback(
    async (rideId: string) => {
      try {
        const response = await api.patch("/rides/hide-destination", { rideId });
        if (response.data.success) {
          const updated = (rideData.recentDestinations || []).filter(
            (dest) => dest.id !== rideId,
          );
          updateRideData({ recentDestinations: updated });
        }
      } catch (err) {
        console.error("❌ Failed to hide destination:", err);
      }
    },
    [rideData.recentDestinations, updateRideData],
  );

  return (
    <RideBookingContext.Provider
      value={{
        rideData,
        loading,
        error,
        currentRide,
        updateRideData,
        setCurrentRide,
        clearRideData,
        submitRideBooking,
        cancelRide,
        fetchRecentDestinations,
        hideRecentDestination,
        fetchPrices,
      }}
    >
      {children}
    </RideBookingContext.Provider>
  );
};

export const useRideBooking = () => {
  const context = useContext(RideBookingContext);
  if (!context)
    throw new Error("useRideBooking must be used within a RideBookingProvider");
  return context;
};
