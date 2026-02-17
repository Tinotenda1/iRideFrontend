// app/services/useSessionRestoration.ts
import { useCallback, useState } from "react";
import { api } from "../../utils/api";
import { getUserInfo } from "../../utils/storage";
import { RideResponse, useRideBooking } from "../context/RideBookingContext";
import { getDriverSocket } from "../driver/socketConnectionUtility/driverSocketService";
import { getPassengerSocket } from "../passenger/socketConnectionUtility/passengerSocketService";
import { restoreSessionOnce } from "../services/sessionRestore";

export const useSessionRestoration = () => {
  const { updateRideData, setCurrentRide } = useRideBooking();
  const [isRestoring, setIsRestoring] = useState(false);

  const waitForSocket = (role: "driver" | "passenger"): Promise<any> => {
    return new Promise((resolve) => {
      const socket =
        role === "driver" ? getDriverSocket() : getPassengerSocket();
      if (socket?.connected) {
        resolve(socket);
      } else {
        const timeout = setTimeout(() => resolve(null), 5000);
        socket?.once("connect", () => {
          clearTimeout(timeout);
          resolve(socket);
        });
      }
    });
  };

  const restoreSession = useCallback(async () => {
    await restoreSessionOnce(async () => {
      try {
        setIsRestoring(true);
        const userInfo = await getUserInfo();
        if (!userInfo?.phone) return;

        const response = await api.post("/reconnect/resume", {
          phone: userInfo.phone.replace(/\D/g, ""),
        });

        if (response.data.success) {
          const { state, tripDetails, role, rideId } = response.data;
          console.log("🚖 Restored Session Trip State:", state);

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

            const socket = await waitForSocket(role);
            if (socket) socket.emit("ride:join_room", { rideId });

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
          // --- NEW LOGIC FOR ON_RATING ---
          else if (state === "on_rating" || state === "completed") {
            if (tripDetails) {
              // Prepare minimal info needed for the RatingModal
              const ratingData: any = {
                rideId: tripDetails.rideId,
                status: "completed",
                driver: {
                  name: tripDetails.driver?.name,
                  phone: tripDetails.driver?.phone,
                  profilePic: tripDetails.driver?.profilePic,
                },
                passenger: {
                  name: tripDetails.passenger?.name,
                  profilePic: tripDetails.passenger?.profilePic,
                  phone: tripDetails.passenger?.phone,
                },
              };
              setCurrentRide(ratingData);
            }

            updateRideData({ status: "completed" });
          }
        }
      } catch (err) {
        console.error("❌ Session Restoration Error:", err);
      } finally {
        setIsRestoring(false);
      }
    });
  }, [updateRideData, setCurrentRide]);

  return { restoreSession, isRestoring };
};
