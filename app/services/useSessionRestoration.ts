// app/services/useSessionRestoration.ts
import { useCallback, useState } from "react";
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { RideResponse, useRideBooking } from "../context/RideBookingContext";

export const useSessionRestoration = () => {
  const { updateRideData, setCurrentRide } = useRideBooking();
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreSession = useCallback(
    async (backendData?: any) => {
      try {
        setIsRestoring(true);
        const userInfo = await getUserInfo();
        if (!userInfo?.phone) return;

        let responseData;
        if (backendData) {
          responseData = backendData;
        } else {
          // Standard REST API call
          const response = await api.post("/reconnect/resume", {
            phone: userInfo.phone.replace(/\D/g, ""),
          });
          responseData = response.data;
        }

        if (responseData?.success) {
          const { state, tripDetails, role, rideId } = responseData;

          console.log("🚖 Restored Session Trip State:", state);
          console.log("🧩 Restore Payload:", {
            state,
            role,
            hasTrip: !!tripDetails,
            rideId,
          });

          // Normalize Coordinates Helper
          const normalize = (loc: any) => ({
            ...loc,
            latitude: loc?.lat ?? loc?.latitude,
            longitude: loc?.lng ?? loc?.longitude,
            address: loc?.address || "",
          });

          if (
            ["matched", "on_trip", "arrived"].includes(state) &&
            tripDetails
          ) {
            const pickup = normalize(tripDetails.pickup);
            const destination = normalize(tripDetails.destination);

            if (role === "driver") {
              const driverRideData: RideResponse = {
                rideId: rideId,
                status: state,
                tripDetails: {
                  ...tripDetails,
                  offer: tripDetails.offer,
                  passenger: {
                    ...tripDetails.passenger,
                    rating: tripDetails.passenger?.rating?.toString(),
                    totalRides: tripDetails.passenger?.totalTrips,
                  },
                  ride: {
                    ...tripDetails,
                    pickup,
                    destination,
                    pickupAddress: pickup.address,
                    destinationAddress: destination.address,
                    vehicleType: tripDetails.vehicleType,
                    paymentMethod: tripDetails.paymentMethod,
                    additionalInfo: tripDetails.additionalInfo,
                  },
                  vehicle: {
                    ...tripDetails.vehicle,
                    licensePlate: tripDetails.vehicle?.plate,
                  },
                },
              };
              setCurrentRide(driverRideData);
              updateRideData({
                rideId,
                status: state as any,
                activeTrip: driverRideData.tripDetails,
              });
            } else {
              // if role is passenger
              const rawDriver = tripDetails.driver || {};
              const rawVehicle = tripDetails.vehicle || {};
              const passengerRideData: RideResponse = {
                rideId,
                status: state,
                offer: Number(tripDetails.offer) || 0,
                driver: {
                  name: rawDriver.name,
                  phone: rawDriver.phone,
                  profilePic: rawDriver.profilePic,
                  rating: Number(rawDriver.rating),
                  totalTrips: Number(rawDriver.totalTrips),
                  vehicle: {
                    model: rawVehicle.model,
                    color: rawVehicle.color,
                    licensePlate: rawVehicle.plate,
                    pic: rawVehicle.pic,
                  },
                },
                pickup,
                destination,
                tripDetails: {
                  ...tripDetails,
                  ride: {
                    pickup,
                    destination,
                    pickupAddress: pickup.address,
                    destinationAddress: destination.address,
                    vehicleType: tripDetails.vehicleType,
                    paymentMethod: tripDetails.paymentMethod,
                  },
                },
              };
              setCurrentRide(passengerRideData);
              updateRideData({
                rideId,
                status: state as any,
                pickup,
                destination,
                offer: passengerRideData.offer,
                driver: passengerRideData.driver,
                activeTrip: passengerRideData.tripDetails,
              });
            }
          }
          // --- RESTORE COMPLETED / ON_RATING STATE ---
          else if (state === "on_rating" || state === "completed") {
            if (tripDetails) {
              const pickup = normalize(tripDetails.pickup);
              const destination = normalize(tripDetails.destination);

              const rawDriver = tripDetails.driver || {};
              const rawVehicle = tripDetails.vehicle || {};
              const rawPassenger = tripDetails.passenger || {};

              const restoredRide: RideResponse = {
                rideId,
                status: state, // ✅ USE REAL STATE

                offer: Number(tripDetails.offer) || 0,

                pickup,
                destination,

                driver: {
                  name: rawDriver.name,
                  phone: rawDriver.phone,
                  profilePic: rawDriver.profilePic,
                  rating: Number(rawDriver.rating),
                  totalTrips: Number(rawDriver.totalTrips),

                  vehicle: {
                    model: rawVehicle.model,
                    color: rawVehicle.color,
                    licensePlate: rawVehicle.plate,
                    pic: rawVehicle.pic,
                  },
                },

                passenger: {
                  id: rawPassenger.id,
                  name: rawPassenger.name,
                  phone: rawPassenger.phone,
                  profilePic: rawPassenger.profilePic,
                },

                tripDetails: {
                  ...tripDetails,

                  ride: {
                    pickup,
                    destination,
                    pickupAddress: pickup.address,
                    destinationAddress: destination.address,
                    vehicleType: tripDetails.vehicleType,
                    paymentMethod: tripDetails.paymentMethod,
                  },
                },
              };

              // ✅ Set global ride
              setCurrentRide(restoredRide);

              // ✅ Update central state
              updateRideData({
                rideId,
                status: state, // ✅ not hardcoded
                driver: restoredRide.driver,
                pickup,
                destination,
                offer: restoredRide.offer,
                activeTrip: restoredRide.tripDetails,
              });

              console.log("✅ Restored rating/completed state:", state);
            }
          }
        }
      } catch (err) {
        console.error("❌ REST Restoration Error:", err);
      } finally {
        setIsRestoring(false);
      }
    },
    [updateRideData, setCurrentRide],
  );
  return { restoreSession, isRestoring };
};
