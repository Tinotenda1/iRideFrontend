// app/context/RideBookingContext.tsx

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { getDriverSocket } from "../driver/socketConnectionUtility/driverSocketService";
import { Place } from "../passenger/components/map/LocationSearch";
import { getPassengerSocket } from "../passenger/socketConnectionUtility/passengerSocketService";
import { restoreSessionOnce } from "../services/sessionRestore";

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
  vehiclePrices?: Record<string, number>;
  recentDestinations?: Place[];

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
  additionalInfo?: string;
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
  fetchRecentDestinations: () => Promise<void>;
  hideRecentDestination: (rideId: string) => Promise<void>;
  reconnecting: boolean;
  checkExistingState: () => Promise<void>;
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

interface RideBookingProviderProps {
  children: ReactNode;
}

export const RideBookingProvider: React.FC<RideBookingProviderProps> = ({
  children,
}) => {
  const [rideData, setRideData] = useState<RideBookingData>(initialRideData);
  const [currentRide, setCurrentRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasResumedRef = useRef(false);

  /**
   * Memoized update function
   */
  const updateRideData = useCallback((updates: Partial<RideBookingData>) => {
    setRideData((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Memoized clear function
   */
  const clearRideData = useCallback(() => {
    hasResumedRef.current = false; // reset
    setRideData(initialRideData);
    setCurrentRide(null);
    setError(null);
    setLoading(false);
  }, []);

  /**
   * Memoized Handshake
   */
  /**
   * Helper to ensure socket is ready before emitting
   */
  const waitForSocket = (role: "driver" | "passenger"): Promise<any> => {
    return new Promise((resolve) => {
      const socket =
        role === "driver" ? getDriverSocket() : getPassengerSocket();
      if (socket?.connected) {
        resolve(socket);
      } else {
        // Wait for the connect event, but set a timeout so we don't hang forever
        const timeout = setTimeout(() => resolve(null), 5000);
        socket?.once("connect", () => {
          clearTimeout(timeout);
          resolve(socket);
        });
      }
    });
  }; /**
   * Memoized Handshake
   */

  const checkExistingState = useCallback(async () => {
    await restoreSessionOnce(async () => {
      try {
        setReconnecting(true);

        const userInfo = await getUserInfo();
        if (!userInfo?.phone) return;

        const response = await api.post("/reconnect/resume", {
          phone: userInfo.phone.replace(/\D/g, ""),
        });

        if (response.data.success) {
          const { state, tripDetails, role } = response.data;

          if (
            (state === "matched" ||
              state === "on_trip" ||
              state === "arrived") &&
            tripDetails
          ) {
            const resumedRide: RideResponse = {
              rideId: tripDetails.rideId,
              status: tripDetails.status,
              pickup: tripDetails.pickup,
              destination: tripDetails.destination,
              vehicleType: tripDetails.vehicleType,
              offer: tripDetails.offer,
              offerType: "fair",
              paymentMethod: tripDetails.paymentMethod,
              timestamp: tripDetails.timestamp,
              additionalInfo: tripDetails.additionalInfo,
              passenger: tripDetails.passenger,
              driver: tripDetails.driver
                ? {
                    ...tripDetails.driver,
                    rating: tripDetails.driver?.rating || 5.0,
                    totalTrips: tripDetails.driver?.totalTrips || 0,
                    vehicle: tripDetails.vehicle,
                  }
                : undefined,
            }; // ⚡ WAITING FOR CONNECTION BEFORE FINISHING RESUMPTION

            const socket = await waitForSocket(role);
            if (socket) {
              socket.emit("ride:join_room", { rideId: tripDetails.rideId });
            }

            setCurrentRide(resumedRide);
            updateRideData({
              status: state,
              activeTrip: tripDetails,
            });
          } else if (state === "on_rating") {
            updateRideData({
              status: "completed",
              activeTrip: tripDetails,
            });
          } else {
            clearRideData();
          }
        }
      } catch (err) {
        console.error("❌ App Resumption Error:", err);
      } finally {
        setReconnecting(false);
      }
    });
  }, [updateRideData, clearRideData]);

  /**
   * Memoized Booking Submission
   */
  const submitRideBooking = useCallback(async (): Promise<RideResponse> => {
    if (loading) return Promise.reject("Request already in progress");

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

      const response = await api.post("/rides/request", bookingData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Ride request failed");
      }

      setCurrentRide(response.data.ride);

      if (response.data.ride?.rideId) {
        getPassengerSocket()?.emit("ride:join_room", {
          rideId: response.data.ride.rideId,
        });
      }

      return response.data.ride;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to request a ride");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    rideData.pickupLocation,
    rideData.destination,
    rideData.vehicleType,
    rideData.paymentMethod,
    rideData.additionalInfo,
    rideData.offer,
    rideData.offerType,
  ]);

  /**
   * Memoized Cancellation
   */
  const cancelRide = useCallback(async () => {
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
  }, [currentRide?.rideId, updateRideData]);

  /**
   * Memoized Fetch History
   */
  const fetchRecentDestinations = useCallback(async () => {
    const hasExistingData =
      rideData.recentDestinations && rideData.recentDestinations.length > 0;
    if (!hasExistingData) setLoading(true);

    try {
      const userInfo = await getUserInfo();
      if (!userInfo?.phone) return;

      const sanitizedPhone = userInfo.phone.replace(/\+/g, "").trim();
      const response = await api.get(
        `/rides/recent-destinations?phone=${sanitizedPhone}`,
      );

      if (response.data.success) {
        const newDestinations = response.data.destinations;
        // Check for actual changes to prevent render loops
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
  }, [rideData.recentDestinations, updateRideData]);

  /**
   * Memoized Hide History
   */
  const hideRecentDestination = useCallback(
    async (rideId: string) => {
      try {
        const response = await api.patch("/rides/hide-destination", { rideId });

        if (response.data.success) {
          const updatedDestinations = (
            rideData.recentDestinations || []
          ).filter((dest) => dest.id !== rideId);
          updateRideData({ recentDestinations: updatedDestinations });
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
        reconnecting,
        error,
        currentRide,
        updateRideData,
        setCurrentRide,
        clearRideData,
        submitRideBooking,
        cancelRide,
        fetchRecentDestinations,
        hideRecentDestination,
        checkExistingState,
      }}
    >
      {children}
    </RideBookingContext.Provider>
  );
};

export const useRideBooking = () => {
  const context = useContext(RideBookingContext);
  if (!context) {
    throw new Error("useRideBooking must be used within a RideBookingProvider");
  }
  return context;
};
