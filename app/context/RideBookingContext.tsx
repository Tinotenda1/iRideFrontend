// RideBookingContext.tsx
import React, { createContext, ReactNode, useContext, useState } from "react";
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { Place } from "../passenger/components/map/LocationSearch";
import { getPassengerSocket } from "../passenger/socketConnectionUtility/passengerSocketService";

/**
 * Interface for the ride booking data (form state)
 */
export interface RideBookingData {
  passengerPhone: string;
  pickupLocation: Place | null;
  destination: Place | null;
  vehicleType: string;
  paymentMethod: string;
  additionalInfo?: string;
  offer?: number;
  offerType?: "poor" | "fair" | "good";
  vehiclePrices?: Record<string, number>; // ✅ ADD RECENT DESTINATIONS FIELD

  recentDestinations?: Place[];

  status?:
    | "idle"
    | "searching"
    | "matched"
    | "arrived"
    | "on_trip"
    | "completed";
  activeTrip?: any;
  requests?: any[];
}

/**
 * Interface for backend ride response
 */
export interface RideResponse {
  rideId: string;
  status: string;
  pickup: any;
  destination: any;
  vehicleType: string;
  offer: number;
  offerType: string;
  paymentMethod: string;
  timestamp: string;
  driver?: {
    name: string;
    phone: string;
    rating: number;
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

/**
 * Context interface
 */
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
  fetchRecentDestinations: () => Promise<void>; // <--- Add this line
  hideRecentDestination: (rideId: string) => Promise<void>; // ✅ New Function
}

/**
 * Create context
 */
const RideBookingContext = createContext<RideBookingContextType | undefined>(
  undefined,
);

/**
 * Initial state
 */
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
  recentDestinations: [], // ✅ Initialize as empty array
  status: "idle",
  activeTrip: null,
};

/**
 * Provider
 */
interface RideBookingProviderProps {
  children: ReactNode;
}

export const RideBookingProvider: React.FC<RideBookingProviderProps> = ({
  children,
}) => {
  const [rideData, setRideData] = useState<RideBookingData>(initialRideData);
  const [currentRide, setCurrentRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); /**
   * Update ride booking data
   */

  const updateRideData = (updates: Partial<RideBookingData>) => {
    setRideData((prev) => ({ ...prev, ...updates }));
  }; /**
   * Clear ride booking form + ride state
   */

  const clearRideData = () => {
    setRideData(initialRideData);
    setCurrentRide(null);
    setError(null);
    setLoading(false);
  }; /**
   * Submit ride request to backend
   */

  const submitRideBooking = async (): Promise<RideResponse> => {
    if (loading) return Promise.reject();

    try {
      setLoading(true);
      setError(null);

      const userInfo = await getUserInfo();
      if (!userInfo?.phone) {
        throw new Error("User phone not found");
      }

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

      const response = await api.post("/rides/request", bookingData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Ride request failed");
      }

      setCurrentRide(response.data.ride);

      if (response.data.ride && response.data.ride.rideId) {
        const socket = getPassengerSocket();
        socket?.emit("ride:join_room", { rideId: response.data.ride.rideId });
      }

      return response.data.ride;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to request a ride");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelRide = async () => {
    try {
      setLoading(true);
      const userInfo = await getUserInfo();
      const rideId = currentRide?.rideId;

      await api.post("/rides/cancel", {
        passengerPhone: userInfo?.phone,
        rideId: rideId,
      });

      setCurrentRide(null);
      updateRideData({ status: "idle", activeTrip: null });
    } catch (err) {
      console.error("❌ Failed to cancel trip:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentDestinations = async () => {
    // 1. If we already have data, don't show the global loading spinner
    const hasExistingData =
      rideData.recentDestinations && rideData.recentDestinations.length > 0;

    if (!hasExistingData) {
      setLoading(true);
    }

    try {
      const userInfo = await getUserInfo();
      if (!userInfo?.phone) return;

      const sanitizedPhone = userInfo.phone.replace(/\+/g, "").trim();

      const response = await api.get(
        `/rides/recent-destinations?phone=${sanitizedPhone}`,
      );

      if (response.data.success) {
        // 2. Only update state if the data has actually changed
        // This prevents unnecessary UI re-renders
        const newDestinations = response.data.destinations;
        if (
          JSON.stringify(newDestinations) !==
          JSON.stringify(rideData.recentDestinations)
        ) {
          updateRideData({ recentDestinations: newDestinations });
        }
      }
    } catch (err) {
      console.error("❌ Context History Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const hideRecentDestination = async (rideId: string) => {
    try {
      console.log("Attempting to hide destination with rideId:", rideId); // Change .post to .patch to match your backend route definition

      const response = await api.patch("/rides/hide-destination", { rideId });

      if (response.data.success) {
        const updatedDestinations = (rideData.recentDestinations || []).filter(
          (dest) => dest.id !== rideId,
        );
        updateRideData({ recentDestinations: updatedDestinations });
      }
    } catch (err) {
      console.error("❌ Failed to hide destination:", err);
    }
  };

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
      }}
    >
      {children}
    </RideBookingContext.Provider>
  );
};

/**
 * Hook
 */
export const useRideBooking = () => {
  const context = useContext(RideBookingContext);
  if (!context) {
    throw new Error("useRideBooking must be used within a RideBookingProvider");
  }
  return context;
};
