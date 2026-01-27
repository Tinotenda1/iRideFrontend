import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { rideData, updateRideData, setCurrentRide } = useRideBooking();

  // --- State ---
  const [trayHeight, setTrayHeight] = useState(0);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [activeInputField, setActiveInputField] = useState<
    "pickup" | "destination"
  >("pickup");
  const [submissionStates, setSubmissionStates] = useState<
    Record<string, "idle" | "submitting" | "accepted">
  >({});

  // --- Cancellation Modal State ---
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // --- Animations ---
  const searchCardBottomAnim = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(1)).current;

  // -------------------------------------------------
  // 1. HELPERS
  // -------------------------------------------------
  const removeOffer = useCallback((driverPhone: string) => {
    setOffers((prev) => prev.filter((o) => o.driver.phone !== driverPhone));
    setSubmissionStates((prev) => {
      const newState = { ...prev };
      delete newState[driverPhone];
      return newState;
    });
  }, []);

  const handleAcceptOffer = useCallback(
    async (offer: any) => {
      console.log("✅ Accepted offer:", offer);
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
      removeOffer(offer.driver.phone);
    },
    [removeOffer],
  );

  const handleDriverArrived = (data: any) => {
    Alert.alert("Driver Arrived!", data.message);
    updateRideData({ status: "arrived" });
  };

  /**
   * ✅ Logic for when a driver cancels remotely
   */
  const handleRequestCancelled = useCallback((data: any) => {
    console.log("🛑 RECEIVED CANCELLATION FROM SERVER:", data);
    setCancelReason(
      data.reason || "The driver was unable to complete this trip.",
    );
    setCancelModalVisible(true);

    // Immediate UI cleanup
    setOffers([]);
    setSubmissionStates({});
  }, []);

  const closeCancelModal = () => {
    setCancelModalVisible(false);
    // Return UI to initial state
    updateRideData({ status: "idle", destination: null });
    trayRef.current?.switchToInput();
  };

  // -------------------------------------------------
  // 2. LIFECYCLE: CONNECT & DISCONNECT
  // -------------------------------------------------
  useEffect(() => {
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

    // Log all incoming events for debugging
    socket.onAny((event, ...args) => {
      console.log(`📡 Incoming Socket Event: ${event}`, args);
    });

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
      setOffers([]);
      setSubmissionStates({});
      const matchedRide: RideResponse = {
        rideId: data.rideId,
        status: "matched",
        pickup: data.tripDetails.ride.pickup,
        destination: data.tripDetails.ride.destination,
        vehicleType: data.tripDetails.ride.vehicleType,
        offer: data.tripDetails.offer,
        offerType: "fair",
        paymentMethod: "Cash",
        timestamp: new Date().toISOString(),
        driver: {
          name: data.tripDetails.driver.name,
          phone: data.tripDetails.driver.phone,
          rating: parseFloat(data.tripDetails.driver.rating),
          profilePic: data.tripDetails.driver.profilePic,
          vehicle: {
            model: data.tripDetails.vehicle.model,
            color: data.tripDetails.vehicle.color,
            licensePlate: data.tripDetails.vehicle.licensePlate,
          },
        },
      };
      setCurrentRide(matchedRide);
      updateRideData({ status: "matched", activeTrip: data.tripDetails });
    };

    const handleMatchFailed = ({ reason }: any) => {
      setSubmissionStates({});
      if (reason === "response_expired") {
        Alert.alert(
          "Offer Expired",
          "This driver's offer is no longer available.",
        );
      }
    };

    const handleDriverUnavailable = ({ driverPhone }: any) =>
      removeOffer(driverPhone);

    // Bind Listeners
    socket.on("ride:driver_response", handleDriverResponse);
    socket.on("ride:matched", handleMatched);
    socket.on("ride:match_failed", handleMatchFailed);
    socket.on("driver_unavailable", handleDriverUnavailable);
    socket.on("ride:driver_arrived", handleDriverArrived);

    // ✅ The critical listener for driver cancellation
    socket.on("ride_cancelled", handleRequestCancelled);

    return () => {
      socket.offAny();
      socket.off("ride:driver_response", handleDriverResponse);
      socket.off("ride:matched", handleMatched);
      socket.off("ride:match_failed", handleMatchFailed);
      socket.off("driver_unavailable", handleDriverUnavailable);
      socket.off("ride:driver_arrived", handleDriverArrived);
      socket.off("ride_cancelled", handleRequestCancelled);
    };
  }, [
    socket,
    removeOffer,
    updateRideData,
    setCurrentRide,
    handleRequestCancelled,
  ]);

  // -------------------------------------------------
  // 4. UI ANIMATIONS & TRAY LOGIC
  // -------------------------------------------------
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (rideData.destination) {
      timeout = setTimeout(() => {
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        trayRef.current?.switchToRides();
      }, RIDE_DELAY);
    } else {
      Animated.timing(menuOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      trayRef.current?.switchToInput();
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [rideData.destination, RIDE_DELAY, menuOpacity]);

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
                onExpire={() => removeOffer(item.driver.phone)}
              />
            )}
            contentContainerStyle={styles.offersListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* ✅ BOLT-STYLE CANCELLATION MODAL */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.boltModal}>
            <View style={styles.iconCircle}>
              <Ionicons name="close-circle" size={44} color="#FF3B30" />
            </View>
            <Text style={styles.modalTitle}>Trip Cancelled</Text>
            <Text style={styles.modalReason}>{cancelReason}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={closeCancelModal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  // --- Modal Styles ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  boltModal: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF3B3010",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
  },
  modalReason: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: "#34C759", // Bolt Green
    width: "100%",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
