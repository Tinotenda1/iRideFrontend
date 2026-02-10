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
import { RideResponse, useRideBooking } from "../context/RideBookingContext";
import { DriverOfferCard } from "./components/DriverOfferCard";
import MapContainer from "./components/map/MapContainer";
import Sidebar from "./components/passengerSidebar";
import Tray from "./components/tabs/Tray";
import AdditionalInfoTray from "./components/trays/AdditionalInfoTray";
import InputTray from "./components/trays/InputTray";
import TripLocationCard from "./components/TripLocationCard";
import {
  connectPassenger,
  disconnectPassenger,
  getPassengerSocket,
} from "./socketConnectionUtility/passengerSocketService";

const PassengerScreen: React.FC = () => {
  // --- Refs ---
  const trayRef = useRef<any>(null);
  const inputTrayRef = useRef<any>(null);
  const infoTrayRef = useRef<any>(null);
  const sidebarRef = useRef<any>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // --- Constants ---
  const RIDE_DELAY = Number(
    process.env.ride_Tab_And_Trip_Location_Card_Delay || 600,
  );

  // --- Socket & Context ---
  const socket = getPassengerSocket();
  const {
    rideData,
    updateRideData,
    currentRide,
    setCurrentRide,
    fetchRecentDestinations,
  } = useRideBooking();

  // --- State ---
  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [ratingVisible, setRatingVisible] = useState(false);
  const [ratingSnapshot, setRatingSnapshot] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Added loading state
  const [activeInputField, setActiveInputField] = useState<
    "pickup" | "destination"
  >("pickup");
  const [submissionStates, setSubmissionStates] = useState<
    Record<string, "idle" | "submitting" | "accepted">
  >({});

  // ✅ Reusable Modal State
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: "arrival" as ModalType,
    title: "",
    message: "",
  });

  // --- Animations ---
  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(1)).current;

  // -------------------------------------------------
  // 1. HANDLERS (Defined at top level to obey Hook rules)
  // -------------------------------------------------

  const handleRatingSubmit = useCallback(
    async (stars: number, comment: string) => {
      const rideId = ratingSnapshot?.rideId;
      const driverPhone = ratingSnapshot?.driverPhone;

      if (!rideId || !driverPhone) {
        Alert.alert("Error", "Could not find ride details. Please try again.");
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
          // ✅ SAFEGUARD: Alert user and DO NOT close modal
          Alert.alert(
            "Rating Failed",
            "We couldn't submit your rating. Please check your connection and try again.",
            [{ text: "OK" }],
          );
          return;
        }

        // ✅ Cleanup ONLY happens on success
        setRatingVisible(false);
        setRatingSnapshot(null);
        setCurrentRide(null);
      } catch (error) {
        console.error("Critical rating error:", error);
        Alert.alert("Error", "An unexpected error occurred.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [ratingSnapshot, setCurrentRide],
  );

  const removeOffer = useCallback((driverPhone: string, rideId: string) => {
    console.log(`Removing offer for driver ${driverPhone} for ride ${rideId}`);

    // 1. Alert the backend
    const activeSocket = getPassengerSocket(); // Using your existing utility getter
    if (activeSocket?.connected) {
      activeSocket.emit("driver:offer_expired", {
        rideId: rideId,
        driverPhone: driverPhone,
      });
    }

    // 2. Local State Cleanup (Logic unchanged)
    setOffers((prev) => prev.filter((o) => o.driver.phone !== driverPhone));
    setSubmissionStates((prev) => {
      const newState = { ...prev };
      delete newState[driverPhone];
      return newState;
    });
  }, []);

  const handleAcceptOffer = useCallback(
    async (offer: any) => {
      updateRideData({ status: "matched" });
      const activeSocket = getPassengerSocket();
      activeSocket?.emit("passenger:select_driver", {
        rideId: offer.rideId,
        driverPhone: offer.driver.phone,
      });
    },
    [updateRideData],
  );

  const handleDeclineOffer = useCallback(
    (offer: any) => {
      const activeSocket = getPassengerSocket();
      activeSocket?.emit("passenger:decline_driver", {
        rideId: offer.rideId,
        driverPhone: offer.driver.phone,
      });
      removeOffer(offer.driver.phone, offer.rideId);
    },
    [removeOffer],
  );

  const handleDriverArrived = useCallback(
    (data: any) => {
      setModalConfig({
        visible: true,
        type: "arrival",
        title: "Driver Arrived!",
        message: data.message || "Your driver is at the pickup point.",
      });
      updateRideData({ status: "arrived" });
    },
    [updateRideData],
  );

  const handleRequestCancelled = useCallback((data: any) => {
    setModalConfig({
      visible: true,
      type: "cancellation",
      title: "Trip Cancelled",
      message: data.reason || "The driver was unable to complete this trip.",
    });
    setOffers([]);
    setSubmissionStates({});
  }, []);

  const handleDriverNoLongerAvailable = (data: { driverPhone: string }) => {
    console.log(
      `Driver ${data.driverPhone} is no longer available (matched elsewhere).`,
    );
    setOffers((prev) =>
      prev.filter((o) => o.driver.phone !== data.driverPhone),
    );
    setSubmissionStates((prev) => {
      const newState = { ...prev };
      delete newState[data.driverPhone];
      return newState;
    });
  };

  const handleDriverBusy = useCallback(
    (data: any) => {
      setModalConfig({
        visible: true,
        type: "cancellation", // Using cancellation type for consistent UI feedback
        title: "Driver Unavailable",
        message:
          data.reason === "already_matched"
            ? "This driver just accepted another trip."
            : "The driver is currently busy. Please try another offer.",
      });

      // Clean up that specific offer from the list
      if (data.driverPhone) {
        setOffers((prev) =>
          prev.filter((o) => o.driver.phone !== data.driverPhone),
        );
      }
      updateRideData({ status: "idle" });
    },
    [updateRideData],
  );

  const handleCloseModal = () => {
    const wasCancellation = modalConfig.type === "cancellation";
    setModalConfig((prev) => ({ ...prev, visible: false }));

    if (wasCancellation) {
      updateRideData({ status: "idle", destination: null });
      trayRef.current?.switchToInput();
    }
  };

  // -------------------------------------------------
  // 2. LIFECYCLE: APP STATE
  // -------------------------------------------------
  useEffect(() => {
    fetchRecentDestinations();
    connectPassenger();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current === "active" &&
        (nextState === "inactive" || nextState === "background")
      ) {
        disconnectPassenger();
      }
      if (
        (appState.current === "inactive" ||
          appState.current === "background") &&
        nextState === "active"
      ) {
        connectPassenger();
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
      disconnectPassenger();
    };
  }, []);

  // -------------------------------------------------
  // 3. LISTENERS (Socket Events)
  // -------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    // 1. Define internal handlers
    const handleTripCompleted = (data: any) => {
      if (currentRide) {
        setRatingSnapshot({
          rideId: currentRide.rideId,
          driverPhone: currentRide.driver?.phone,
          driverName: currentRide.driver?.name,
          driverPic: currentRide.driver?.profilePic,
        });
      }

      // Show rating modal
      setRatingVisible(true);
      updateRideData({ status: "idle", destination: null });
      trayRef.current?.switchToInput();
      fetchRecentDestinations();
    };

    const handleDriverResponse = (newOffer: any) => {
      const driverPhone = newOffer.driver?.phone;
      if (!driverPhone || !newOffer.rideId) return;
      const expiresIn = newOffer.expiresIn || 30000;
      const expiresAt = Date.now() + expiresIn;
      setOffers((prev) => {
        const filtered = prev.filter((o) => o.driver.phone !== driverPhone);
        return [{ ...newOffer, expiresAt, expiresIn }, ...filtered];
      });
      setSubmissionStates((prev) => ({ ...prev, [driverPhone]: "idle" }));
    };

    const handleMatched = (data: any) => {
      console.log("🚖 Ride Matched:", data);
      setOffers([]);
      setSubmissionStates({});
      const { tripDetails, rideId } = data;

      const matchedRide: RideResponse = {
        rideId: rideId,
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
          rating: parseFloat(tripDetails.driver.rating || "5.0"),
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

    const handleTripStarted = (data: any) => {
      updateRideData({ status: "on_trip" });
      setModalConfig({
        visible: true,
        type: "started",
        title: "Trip Started",
        message: "You are now on your way!",
      });
      setTimeout(() => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
      }, 12000);
    };

    // 2. Attach listeners
    socket.on("ride:driver_response", handleDriverResponse);
    socket.on("ride:matched", handleMatched);
    socket.on("ride:driver_arrived", handleDriverArrived);
    socket.on("ride_cancelled", handleRequestCancelled);
    socket.on("ride:completed", handleTripCompleted);
    socket.on("ride:trip_started", handleTripStarted);
    socket.on("driver:no_longer_available", handleDriverNoLongerAvailable);
    socket.on("ride:match_failed", handleDriverBusy);

    // 3. Cleanup listeners
    return () => {
      socket.off("ride:driver_response", handleDriverResponse);
      socket.off("ride:matched", handleMatched);
      socket.off("ride:driver_arrived", handleDriverArrived);
      socket.off("ride_cancelled", handleRequestCancelled);
      socket.off("ride:completed", handleTripCompleted);
      socket.off("ride:trip_started", handleTripStarted);
      socket.off("driver:no_longer_available", handleDriverNoLongerAvailable);
      socket.off("ride:match_failed", handleDriverBusy);
    };
  }, [
    socket,
    currentRide,
    updateRideData,
    setCurrentRide,
    handleRequestCancelled,
    handleDriverArrived,
    handleDriverBusy,
    fetchRecentDestinations,
  ]);
  // -------------------------------------------------
  // 4. UI ANIMATIONS & TRAY LOGIC
  // -------------------------------------------------
  // app/passenger/index.tsx

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    // ✅ Identify all "Active" ride states
    const isActiveOrSearching = [
      "searching",
      "matched",
      "arrived",
      "on_trip",
    ].includes(rideData.status || "");

    if (rideData.destination) {
      timeout = setTimeout(() => {
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // ✅ ONLY auto-switch to Ride Selection if we are NOT searching or in a ride
        if (!isActiveOrSearching) {
          trayRef.current?.switchToRides();
        }
      }, RIDE_DELAY);
    } else {
      // ... logic for switchToInput ...
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [rideData.destination, rideData.status, RIDE_DELAY, menuOpacity]);
  // Added rideData.status to dependency array ^

  const handleTrayHeightChange = useCallback(
    (height: number) => {
      setTrayHeight(height);
      const bottomPosition = isTrayOpen ? height + 10 : 90;
      Animated.spring(searchCardBottomAnim, {
        toValue: bottomPosition,
        useNativeDriver: false,
      }).start();
    },
    [isTrayOpen, searchCardBottomAnim],
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <MapContainer trayHeight={trayHeight} />
        <Animated.View
          style={[styles.menuButton, { opacity: menuOpacity }]}
          pointerEvents={rideData.destination ? "none" : "auto"}
        >
          <TouchableOpacity
            onPress={() => sidebarRef.current?.open()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#00000096" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Tray
        ref={trayRef}
        onTrayHeightChange={handleTrayHeightChange}
        onTrayStateChange={setIsTrayOpen}
        onLocationInputFocus={(field) => {
          setActiveInputField(field);
          inputTrayRef.current?.open();
        }}
        onOpenAdditionalInfo={() => infoTrayRef.current?.open()}
        hasOffers={offers.length > 0}
      />

      {offers.length > 0 && rideData.status !== "matched" && (
        <View style={styles.offersOverlay}>
          <FlatList
            data={offers}
            keyExtractor={(item) => item.driver.phone}
            renderItem={({ item }) => (
              <DriverOfferCard
                offer={item}
                status={submissionStates[item.driver.phone] || "idle"}
                onAccept={handleAcceptOffer}
                onDecline={() => handleDeclineOffer(item)}
                onExpire={() => removeOffer(item.driver.phone, item.rideId)}
              />
            )}
            contentContainerStyle={styles.offersListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <TripStatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />

      <RatingModal
        visible={ratingVisible}
        title="Trip Complete!"
        userName={ratingSnapshot?.driverName}
        userImage={ratingSnapshot?.driverPic}
        subtitle="How was your experience with your driver?"
        onSelectRating={handleRatingSubmit}
      />

      <TripLocationCard onPress={() => trayRef.current?.switchToInput()} />
      <InputTray
        ref={inputTrayRef}
        activeField={activeInputField}
        onClose={() => {}}
      />
      <AdditionalInfoTray ref={infoTrayRef} onClose={() => {}} />
      <Sidebar ref={sidebarRef} userType="passenger" />
    </View>
  );
};

export default PassengerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  contentArea: { flex: 1, backgroundColor: "#f5f5f5", overflow: "hidden" },
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
  offersListContent: { paddingTop: 10, paddingBottom: 250 },
});
