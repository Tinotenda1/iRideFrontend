// app/passenger/index.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import RatingModal from "../../components/RatingModal";
import TripStatusModal, { ModalType } from "../../components/TripStatusModal";
import { submitUserRating } from "../../utils/ratingSubmittion";
import { getUserInfo } from "../../utils/storage";

import { RideResponse, useRideBooking } from "../context/RideBookingContext";
import { useSessionRestoration } from "../services/useSessionRestoration";

import { DriverOfferCard } from "./components/DriverOfferCard";
import MapContainer from "./components/map/MapContainer";
import Sidebar from "./components/passengerSidebar";
import Tray from "./components/tabs/Tray";
import AdditionalInfoTray from "./components/trays/AdditionalInfoTray";
import InputTray from "./components/trays/InputTray";
import TripLocationCard from "./components/TripLocationCard";

import { resetSessionRestore } from "../services/sessionRestore";
import {
  getPassengerSocket,
  onReconnectState,
} from "./socketConnectionUtility/passengerSocketService";

const PassengerScreen: React.FC = () => {
  /* ===========================
     REFS
  =========================== */

  const trayRef = useRef<any>(null);
  const inputTrayRef = useRef<any>(null);
  const infoTrayRef = useRef<any>(null);
  const sidebarRef = useRef<any>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  /* ===========================
     CONSTANTS
  =========================== */

  const RIDE_DELAY = Number(
    process.env.ride_Tab_And_Trip_Location_Card_Delay || 600,
  );

  /* ===========================
     CONTEXT & SESSION
  =========================== */

  const socket = getPassengerSocket();

  const {
    rideData,
    updateRideData,
    currentRide,
    setCurrentRide,
    fetchRecentDestinations,
  } = useRideBooking();

  const { restoreSession, isRestoring } = useSessionRestoration();

  /* ===========================
     STATE
  =========================== */

  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const [offers, setOffers] = useState<any[]>([]);

  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingSnapshot, setRatingSnapshot] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentAppState, setCurrentAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  const [activeInputField, setActiveInputField] = useState<
    "pickup" | "destination"
  >("pickup");

  const [submissionStates, setSubmissionStates] = useState<
    Record<string, "idle" | "submitting" | "accepted">
  >({});

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: "arrival" as ModalType,
    title: "",
    message: "",
  });

  /* ===========================
     ANIMATIONS
  =========================== */

  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(1)).current;

  /* ===========================
     RATING
  =========================== */

  const handleRatingSubmit = useCallback(
    async (stars: number, comment: string) => {
      const rideId = ratingSnapshot?.rideId;
      const driverPhone = ratingSnapshot?.driverPhone;

      if (!rideId || !driverPhone) {
        Alert.alert("Error", "Could not find ride details.");
        return;
      }

      setIsSubmitting(true);

      try {
        const success = await submitUserRating(
          "driver",
          driverPhone,
          rideId,
          stars,
          comment,
        );

        if (!success) {
          Alert.alert(
            "Error",
            "Could not submit rating. Please make sure you have an active internet connection and try again.",
          );
          return;
        }

        setRatingVisible(false);
        setRatingSnapshot(null);
        setCurrentRide(null);

        /* FORCE FULL RESET */
        updateRideData({
          status: "idle",
          destination: null,
          activeTrip: null,
          //offer: null,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [ratingSnapshot, setCurrentRide],
  );

  /* ===========================
     OFFERS
  =========================== */

  const removeOffer = useCallback((driverPhone: string, rideId: string) => {
    const activeSocket = getPassengerSocket();

    activeSocket?.emit("driver:offer_expired", {
      rideId,
      driverPhone,
    });

    setOffers((prev) => prev.filter((o) => o.driver.phone !== driverPhone));

    setSubmissionStates((prev) => {
      const newState = { ...prev };
      delete newState[driverPhone];
      return newState;
    });
  }, []);

  const removeOfferForUnmatchedDrivers = useCallback(async (rideId: string) => {
    const user = await getUserInfo();

    if (!user?.phone) return;

    getPassengerSocket()?.emit("driver:offer_cancelled", {
      rideId,
      passengerPhone: user.phone,
    });
  }, []);

  const handleAcceptOffer = useCallback(
    (offer: any) => {
      updateRideData({ status: "matched" });

      setCurrentRide(offer);

      getPassengerSocket()?.emit("passenger:select_driver", {
        rideId: offer.rideId,
        driverPhone: offer.driver.phone,
      });
    },
    [updateRideData, setCurrentRide],
  );

  const handleDeclineOffer = useCallback(
    (offer: any) => {
      getPassengerSocket()?.emit("passenger:decline_driver", {
        rideId: offer.rideId,
        driverPhone: offer.driver.phone,
      });

      removeOffer(offer.driver.phone, offer.rideId);
    },
    [removeOffer],
  );

  /* ===========================
     MODALS
  =========================== */

  const handleCloseModal = () => {
    const cancelled = modalConfig.type === "cancellation";

    setModalConfig((p) => ({ ...p, visible: false }));

    if (cancelled) {
      updateRideData({ status: "idle", destination: null });
      trayRef.current?.switchToInput();
    }
  };

  /* ===========================
      APP STATE + CONNECT
  =========================== */
  useEffect(() => {
    fetchRecentDestinations();
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      // Typing 'prev' as AppStateStatus fixes the TS7006 error
      setCurrentAppState((prev: AppStateStatus) => {
        if (
          prev === "active" &&
          (next === "inactive" || next === "background")
        ) {
          resetSessionRestore(); // ✅ VERY IMPORTANT
        }

        if (
          (prev === "inactive" || prev === "background") &&
          next === "active"
        ) {
        }
        return next;
      });
    });

    return () => {
      sub.remove();
    };
  }, []); // Logic is now self-contained; empty dependency array is fine.

  /* ===========================
     BACKEND RESTORE PUSH
  =========================== */

  useEffect(() => {
    // We bind the listener to the CURRENT socket instance
    const unsub = onReconnectState((data) => {
      console.log("♻️ Restore push received:", data);
      restoreSession(data);
    });

    return () => {
      unsub?.();
    };
  }, [restoreSession, socket]);

  /* ===========================
     SHOW RATING AFTER RESTORE
  =========================== */

  useEffect(() => {
    if (rideData.status === "on_rating" && currentRide?.driver) {
      setRatingSnapshot({
        rideId: currentRide.rideId,
        driverPhone: currentRide.driver.phone,
        driverName: currentRide.driver.name,
        driverPic: currentRide.driver.profilePic,
      });

      setRatingVisible(true);
    }
  }, [rideData.status, currentRide]);

  /* ===========================
     SOCKET LISTENERS (FULL)
  =========================== */

  useEffect(() => {
    if (!socket) return;

    const handleTripCompleted = () => {
      if (currentRide) {
        setRatingSnapshot({
          rideId: currentRide.rideId,
          driverPhone: currentRide.driver?.phone,
          driverName: currentRide.driver?.name,
          driverPic: currentRide.driver?.profilePic,
        });
      }

      setRatingVisible(true);

      updateRideData({
        status: "completed",
        destination: null,
        activeTrip: null,
      });

      trayRef.current?.switchToInput();

      fetchRecentDestinations();
    };

    const handleDriverResponse = (newOffer: any) => {
      const phone = newOffer.driver?.phone;

      if (!phone || !newOffer.rideId) return;

      const expiresIn = newOffer.expiresIn || 30000;

      setOffers((prev) => {
        const filtered = prev.filter((o) => o.driver.phone !== phone);

        return [
          {
            ...newOffer,
            expiresIn,
            expiresAt: Date.now() + expiresIn,
          },
          ...filtered,
        ];
      });

      setSubmissionStates((p) => ({ ...p, [phone]: "idle" }));
    };

    const handleMatched = (data: any) => {
      setOffers([]);
      setSubmissionStates({});

      const { tripDetails, rideId } = data;

      const matchedRide: RideResponse = {
        rideId,
        status: "matched",

        pickup: {
          address: tripDetails.ride.pickupAddress,
          latitude: tripDetails.ride.pickup.lat,
          longitude: tripDetails.ride.pickup.lng,
        },

        destination: {
          address: tripDetails.ride.destinationAddress,
          latitude: tripDetails.ride.destination.lat,
          longitude: tripDetails.ride.destination.lng,
        },

        vehicleType: tripDetails.ride.vehicleType,
        offer: tripDetails.offer,
        offerType: tripDetails.offerType || "fair",
        paymentMethod: tripDetails.ride.paymentMethod || "Cash",
        timestamp: new Date().toISOString(),

        driver: {
          name: tripDetails.driver.name,
          phone: tripDetails.driver.phone,
          rating: parseFloat(tripDetails.driver.rating || "5"),
          profilePic: tripDetails.driver.profilePic,
          totalTrips: tripDetails.driver.totalTrips || 0,

          vehicle: {
            model: tripDetails.vehicle.model,
            color: tripDetails.vehicle.color,
            licensePlate: tripDetails.vehicle.licensePlate,
            pic: tripDetails.vehicle.pic,
          },
        },
      };

      setCurrentRide(matchedRide);

      updateRideData({
        status: "matched",
        activeTrip: tripDetails,
        offer: tripDetails.offer,
      });
    };

    const handleTripStarted = () => {
      updateRideData({ status: "on_trip" });

      setModalConfig({
        visible: true,
        type: "started",
        title: "Trip Started",
        message: "You are on your way.",
      });

      setTimeout(() => {
        setModalConfig((p) => ({ ...p, visible: false }));
      }, 12000);
    };

    const handleDriverArrived = (data: any) => {
      setModalConfig({
        visible: true,
        type: "arrival",
        title: "Driver Arrived",
        message: data.message || "Driver is here.",
      });

      updateRideData({ status: "arrived" });
    };

    const handleCancelled = (data: any) => {
      setModalConfig({
        visible: true,
        type: "cancellation",
        title: "Trip Cancelled",
        message: data.reason || "Trip cancelled.",
      });

      setOffers([]);
      setSubmissionStates({});

      updateRideData({ status: "idle" });
    };

    const handleNoDriver = (data: any) => {
      setOffers((p) => p.filter((o) => o.driver.phone !== data.driverPhone));
    };

    const handleBusy = () => {
      updateRideData({ status: "idle" });
    };

    /* ATTACH */

    socket.on("ride:completed", handleTripCompleted);
    socket.on("ride:driver_response", handleDriverResponse);
    socket.on("ride:matched", handleMatched);
    socket.on("ride:trip_started", handleTripStarted);
    socket.on("ride:driver_arrived", handleDriverArrived);
    socket.on("ride_cancelled", handleCancelled);
    socket.on("driver:no_longer_available", handleNoDriver);
    socket.on("ride:match_failed", handleBusy);

    /* CLEANUP */

    return () => {
      socket.off("ride:completed", handleTripCompleted);
      socket.off("ride:driver_response", handleDriverResponse);
      socket.off("ride:matched", handleMatched);
      socket.off("ride:trip_started", handleTripStarted);
      socket.off("ride:driver_arrived", handleDriverArrived);
      socket.off("ride_cancelled", handleCancelled);
      socket.off("driver:no_longer_available", handleNoDriver);
      socket.off("ride:match_failed", handleBusy);
    };
  }, [
    socket,
    currentRide,
    updateRideData,
    setCurrentRide,
    fetchRecentDestinations,
  ]);

  /* ===========================
     UI ANIMATIONS
  =========================== */

  useEffect(() => {
    let timeout: any;

    const activeStates = ["searching", "matched", "arrived", "on_trip"];

    if (rideData.destination) {
      timeout = setTimeout(() => {
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        if (!activeStates.includes(rideData.status || "")) {
          trayRef.current?.switchToRides();
        }
      }, RIDE_DELAY);
    }

    return () => clearTimeout(timeout);
  }, [rideData.destination, rideData.status]);

  /* ===========================
     TRAY
  =========================== */

  const handleTrayHeightChange = useCallback(
    (height: number) => {
      setTrayHeight(height);

      Animated.spring(searchCardBottomAnim, {
        toValue: isTrayOpen ? height + 10 : 90,
        useNativeDriver: false,
      }).start();
    },
    [isTrayOpen],
  );

  /* ===========================
     RENDER
  =========================== */

  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <MapContainer trayHeight={trayHeight} />
        <Animated.View
          style={[styles.menuButton, { opacity: menuOpacity }]}
          pointerEvents={rideData.destination ? "none" : "auto"}
        >
          <TouchableOpacity onPress={() => sidebarRef.current?.open()}>
            <Ionicons name="menu" size={28} color="#00000096" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Tray
        ref={trayRef}
        onTrayHeightChange={handleTrayHeightChange}
        onTrayStateChange={setIsTrayOpen}
        onLocationInputFocus={(f) => {
          setActiveInputField(f);
          inputTrayRef.current?.open();
        }}
        onOpenAdditionalInfo={() => infoTrayRef.current?.open()}
        hasOffers={offers.length > 0}
        onClearOffers={() => {
          const id = currentRide?.rideId || rideData?.activeTrip?.rideId;

          if (id) removeOfferForUnmatchedDrivers(id);
        }}
      />

      {offers.length > 0 && rideData.status !== "matched" && (
        <View style={styles.offersOverlay}>
          <FlatList
            data={offers}
            keyExtractor={(i) => i.driver.phone}
            renderItem={({ item }) => (
              <DriverOfferCard
                offer={item}
                status={submissionStates[item.driver.phone] || "idle"}
                onAccept={handleAcceptOffer}
                onDecline={() => handleDeclineOffer(item)}
                onExpire={() => removeOffer(item.driver.phone, item.rideId)}
              />
            )}
          />
        </View>
      )}

      <TripStatusModal {...modalConfig} onClose={handleCloseModal} />

      <RatingModal
        visible={ratingVisible}
        title="Trip Complete!"
        userName={ratingSnapshot?.driverName}
        userImage={ratingSnapshot?.driverPic}
        subtitle="How was your experience?"
        onSelectRating={handleRatingSubmit}
        isLoading={isSubmitting} // Use the variable here to fix the ESLint error
      />

      <TripLocationCard onPress={() => trayRef.current?.switchToInput()} />

      <InputTray ref={inputTrayRef} activeField={activeInputField} />

      <AdditionalInfoTray ref={infoTrayRef} />

      <Sidebar ref={sidebarRef} userType="passenger" />
    </View>
  );
};

export default PassengerScreen;

/* ===========================
   STYLES
=========================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  contentArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },

  menuButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 50,
    zIndex: 100,
  },

  offersOverlay: {
    position: "absolute",
    top: 125,
    bottom: 0,
    width: "100%",
    zIndex: 5,
    paddingHorizontal: 16,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loaderCard: {
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loaderText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
