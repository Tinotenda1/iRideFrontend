// app/context/RideBookingContext.tsx
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { api } from '../../utils/api';
import { getUserInfo } from '../../utils/storage';
import { Place } from '../passenger/components/map/LocationSearch';

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
  offer?: number; // Passenger offer amount
  offerType?: 'poor' | 'fair' | 'good';
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
  clearRideData: () => void;
  submitRideBooking: () => Promise<RideResponse>;
}

/**
 * Create context
 */
const RideBookingContext = createContext<RideBookingContextType | undefined>(
  undefined
);

/**
 * Initial state
 */
const initialRideData: RideBookingData = {
  passengerPhone: '',
  pickupLocation: null,
  destination: null,
  vehicleType: '',
  paymentMethod: '',
  additionalInfo: '',
  offer: 0,
  offerType: 'fair',
};

/**
 * Provider
 */
interface RideBookingProviderProps {
  children: ReactNode;
}

export const RideBookingProvider: React.FC<RideBookingProviderProps> = ({
  children
}) => {
  const [rideData, setRideData] = useState<RideBookingData>(initialRideData);
  const [currentRide, setCurrentRide] = useState<RideResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Update ride booking data
   */
  const updateRideData = (updates: Partial<RideBookingData>) => {
    setRideData(prev => ({ ...prev, ...updates }));
  };

  /**
   * Clear ride booking form + ride state
   */
  const clearRideData = () => {
    setRideData(initialRideData);
    setCurrentRide(null);
    setError(null);
    setLoading(false);
  };

  /**
   * Submit ride request to backend
   * Matches: controllers/ridesControllers/requestRide.js
   */
  const submitRideBooking = async (): Promise<RideResponse> => {
  if (loading) return Promise.reject();

    try {
      setLoading(true);
      setError(null);

      // Get logged-in user info
      const userInfo = await getUserInfo();
      if (!userInfo?.phone) {
        throw new Error('User phone not found');
      }

      const bookingData = {
        passengerPhone: userInfo.phone, 
        pickup: {
          latitude: Number(rideData.pickupLocation?.latitude),
          longitude: Number(rideData.pickupLocation?.longitude),
          address: rideData.pickupLocation?.address || ''
        },
        destination: {
          latitude: Number(rideData.destination?.latitude),
          longitude: Number(rideData.destination?.longitude),
          address: rideData.destination?.address || ''
        },
        vehicleType: rideData.vehicleType,
        paymentMethod: rideData.paymentMethod,
        additionalInfo: rideData.additionalInfo || '',
        offer: Number(rideData.offer) || 0, 
        offerType: rideData.offerType || 'fair'
      };

      console.log('Submitting ride request:', bookingData);

      const response = await api.post('/rides/request', bookingData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Ride request failed');
      }

      // ✅ Save active ride
      setCurrentRide(response.data.ride);

      console.log('Ride created successfully:', response.data.ride);

      return response.data.ride;

    } catch (err: any) {
      console.error('Ride booking failed:', err?.response?.data || err);
      setError(err?.response?.data?.message || 'Failed to request a ride');
      throw err;
    } finally {
      setLoading(false);
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
        clearRideData,
        submitRideBooking
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
    throw new Error(
      'useRideBooking must be used within a RideBookingProvider'
    );
  }
  return context;
};
