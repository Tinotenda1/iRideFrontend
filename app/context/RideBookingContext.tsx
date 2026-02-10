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
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { getDriverSocket } from "../driver/socketConnectionUtility/driverSocketService";
import { Place } from "../passenger/components/map/LocationSearch";
import { getPassengerSocket } from "../passenger/socketConnectionUtility/passengerSocketService";
import { restoreSessionOnce } from "../services/sessionRestore";

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
  const [reconnecting, setReconnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasResumedRef = useRef(false);

  useEffect(() => {
    console.log(`[RideBookingContext] Status: ${rideData.status}`);
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

  const waitForSocket = (role: "driver" | "passenger"): Promise<any> => {
    return new Promise((resolve) => {
      const socket =
        role === "driver" ? getDriverSocket() : getPassengerSocket();
      if (socket?.connected) resolve(socket);
      else {
        const timeout = setTimeout(() => resolve(null), 5000);
        socket?.once("connect", () => {
          clearTimeout(timeout);
          resolve(socket);
        });
      }
    });
  };

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
            ["matched", "on_trip", "arrived"].includes(state) &&
            tripDetails
          ) {
            const resumedRide: RideResponse = {
              ...tripDetails,
              offerType: "fair",
              driver: tripDetails.driver
                ? {
                    ...tripDetails.driver,
                    rating: tripDetails.driver?.rating || 5.0,
                    vehicle: tripDetails.vehicle,
                  }
                : undefined,
            };
            const socket = await waitForSocket(role);
            if (socket)
              socket.emit("ride:join_room", { rideId: tripDetails.rideId });
            setCurrentRide(resumedRide);
            updateRideData({ status: state, activeTrip: tripDetails });
          } else if (state === "on_rating") {
            updateRideData({ status: "completed", activeTrip: tripDetails });
          } else clearRideData();
        }
      } catch (err) {
        console.error("❌ App Resumption Error:", err);
      } finally {
        setReconnecting(false);
      }
    });
  }, [updateRideData, clearRideData]);

  const fetchPrices = useCallback(
    async (pickup: Place, destination: Place) => {
      try {
        if (!pickup.latitude || !destination.latitude) return;

        const response = await api.post("/pricing/suggest", {
          pickup: { latitude: pickup.latitude, longitude: pickup.longitude },
          destination: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        });

        console.log("[Context] Price fetch response:", response.data);

        if (response.data && response.data.suggestions) {
          // ✅ Transform array [{vehicleType: '4seater', suggestedPrice: 4.5}, ...]
          // to Record { "4seater": 4.5, "7seater": 7.5 }
          const priceMap: Record<string, number> = {};
          response.data.suggestions.forEach((item: any) => {
            priceMap[item.vehicleType] = item.suggestedPrice;
          });

          console.log("[Context] Prices mapped successfully:", priceMap);

          updateRideData({ vehiclePrices: priceMap });
        }
      } catch (err) {
        console.error("❌ Failed to fetch price estimates:", err);
      }
    },
    [updateRideData],
  );

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
      if (!response.data?.success)
        throw new Error(response.data?.message || "Ride request failed");
      setCurrentRide(response.data.ride);
      if (response.data.ride?.rideId)
        getPassengerSocket()?.emit("ride:join_room", {
          rideId: response.data.ride.rideId,
        });
      return response.data.ride;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to request a ride");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loading, rideData]);

  const cancelRide = useCallback(async () => {
    try {
      setLoading(true);
      const userInfo = await getUserInfo();
      await api.post("/rides/cancel", {
        passengerPhone: userInfo?.phone,
        rideId: currentRide?.rideId,
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

  const fetchRecentDestinations = useCallback(async () => {
    if (!rideData.recentDestinations?.length) setLoading(true);
    try {
      const userInfo = await getUserInfo();
      if (!userInfo?.phone) return;
      const response = await api.get(
        `/rides/recent-destinations?phone=${userInfo.phone.replace(/\+/g, "").trim()}`,
      );
      if (response.data.success)
        updateRideData({ recentDestinations: response.data.destinations });
    } catch (err) {
      console.error("❌ Context History Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [rideData.recentDestinations, updateRideData]);

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
