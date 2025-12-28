// context/RideBookingContext.tsx
import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Place } from '../../components/map/LocationSearch';

// Interface for the ride booking data
export interface RideBookingData {
  pickupLocation: Place | null;
  destination: Place | null;
  vehicleType: string;
  paymentMethod: string;
  additionalInfo?: string;
  offer?: number; // Added offer field - the money passenger is willing to pay
}

// Interface for the context
interface RideBookingContextType {
  rideData: RideBookingData;
  updateRideData: (updates: Partial<RideBookingData>) => void;
  clearRideData: () => void;
  submitRideBooking: () => void;
}

// Create the context
const RideBookingContext = createContext<RideBookingContextType | undefined>(undefined);

// Initial state for ride booking data
const initialRideData: RideBookingData = {
  pickupLocation: null,
  destination: null,
  vehicleType: '',
  paymentMethod: '',
  additionalInfo: '',
  offer: 0, // Added offer with 0 as default value
};

// Provider component
interface RideBookingProviderProps {
  children: ReactNode;
}

export const RideBookingProvider: React.FC<RideBookingProviderProps> = ({ children }) => {
  const [rideData, setRideData] = useState<RideBookingData>(initialRideData);

  /**
   * Update ride booking data with partial updates
   */
  const updateRideData = (updates: Partial<RideBookingData>) => {
    setRideData(prev => ({ ...prev, ...updates }));
  };

  /**
   * Clear all ride booking data
   */
  const clearRideData = () => {
    setRideData(initialRideData);
  };

  /**
   * Submit ride booking to backend
   */
  const submitRideBooking = () => {
    // Prepare data for backend
    const bookingData = {
      pickup: {
        latitude: rideData.pickupLocation?.latitude,
        longitude: rideData.pickupLocation?.longitude,
        name: rideData.pickupLocation?.name,
        address: rideData.pickupLocation?.address,
      },
      destination: {
        latitude: rideData.destination?.latitude,
        longitude: rideData.destination?.longitude,
        name: rideData.destination?.name,
        address: rideData.destination?.address,
      },
      vehicleType: rideData.vehicleType,
      paymentMethod: rideData.paymentMethod,
      additionalInfo: rideData.additionalInfo,
      offer: rideData.offer, // Include offer in booking data
      timestamp: new Date().toISOString(),
    };

    // Log for now - this will be replaced with actual API call
    console.log('Submitting ride booking to backend:', bookingData);
    
    // TODO: Replace with actual API call
    // await api.post('/rides', bookingData);
    
    // Clear data after submission (or handle success/error states)
    // clearRideData();
  };

  return (
    <RideBookingContext.Provider
      value={{
        rideData,
        updateRideData,
        clearRideData,
        submitRideBooking,
      }}
    >
      {children}
    </RideBookingContext.Provider>
  );
};

// Custom hook to use the ride booking context
export const useRideBooking = () => {
  const context = useContext(RideBookingContext);
  if (context === undefined) {
    throw new Error('useRideBooking must be used within a RideBookingProvider');
  }
  return context;
};