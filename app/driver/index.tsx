// app/driver/index.tsx
import { theme } from "@/constants/theme";
import { getUserInfo } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
// Added Modal, Text, TouchableOpacity, and Ionicons (via @expo/vector-icons)
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import DriverFooterNav from "./components/DriverFooterNav";
import DriverHeader from "./components/DriverHeader";
import Sidebar from "./components/DriverSideBar";
import DriverSettingsTray from "./components/trays/DriverSettingsTray";
import DriverTray from "./components/trays/DriverTray";
import RideRequestTray from "./components/trays/RideRequestTray";
import DriverHome from "./screens/DriverHome";

import {
  disconnectDriver,
  getDriverSocketStatus,
  handleDriverResponse,
  isDriverOnline,
  onNewRideRequest,
  onRideCancelled, // Added this import
} from "./socketConnectionUtility/driverSocketService";

type Screen = "home" | "wallet" | "revenue" | "notifications";
export type SubmissionState = "idle" | "submitting" | "submitted";

const DriverDashboard: React.FC = () => {
  const router = useRouter();
  const sidebarRef = useRef<any>(null);
  const settingsTrayRef = useRef<any>(null);
  const rideTrayRef = useRef<any>(null);
  const driverTrayRef = useRef<any>(null);

  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [online, setOnline] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [trayHeight, setTrayHeight] = useState(0);

  // --- Cancellation Modal State ---
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [submissionStates, setSubmissionStates] = useState<
    Record<string, SubmissionState>
  >({});
  const [submittedOffers, setSubmittedOffers] = useState<
    Record<string, number>
  >({});

  // ✅ New Effect: Listen for Trip Cancellation
  useEffect(() => {
    if (!online) return;

    const unsubscribe = onRideCancelled((data: any) => {
      console.log("🛑 Passenger cancelled trip:", data);
      setCancelReason(
        data.reason || "The passenger has cancelled the trip request.",
      );
      setCancelModalVisible(true);

      // Clean up local ride states
      setIncomingRides([]);
      setSubmissionStates({});
      setSubmittedOffers({});

      // Close the ride request tray if it's open
      rideTrayRef.current?.close();
    });

    return () => unsubscribe();
  }, [online]);

  // MODAL CLOSE HANDLER
  const closeCancelModal = () => {
    setCancelModalVisible(false);

    // ✅ Transition the tray back to the "Online" state (radar mode)
    if (driverTrayRef.current) {
      driverTrayRef.current.goOnline();
    }
  };

  useEffect(() => {
    if (!online) return;
    const unsubscribe = onNewRideRequest((newRide: any) => {
      setIncomingRides((prev) => {
        if (prev.find((r) => r.rideId === newRide.rideId)) return prev;
        return [...prev, newRide];
      });
    });
    return () => unsubscribe();
  }, [online]);

  useEffect(() => {
    const loadDriver = async () => {
      try {
        const user = await getUserInfo();
        if (!user) {
          router.replace("/auth/login" as any);
          return;
        }
        setDriverInfo(user);
      } catch (err) {
        console.error("❌ Failed to load driver info:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDriver();
  }, [router]);

  useEffect(() => {
    return () => disconnectDriver();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentOnline = isDriverOnline();
      const status = getDriverSocketStatus();

      if (online === true && currentOnline === false) {
        driverTrayRef.current?.goOffline();
      } else if (online === false && currentOnline === true) {
        driverTrayRef.current?.goOnline();
      }

      setOnline(currentOnline);
      setIsConnecting(status === "connecting" || status === "reconnecting");
    }, 500);
    return () => clearInterval(interval);
  }, [online]);

  const handleDecline = (ride: any) => {
    setIncomingRides((prev) => prev.filter((r) => r.rideId !== ride.rideId));
  };

  const handleOfferSubmission = async (
    rideId: string,
    offer: number,
    baseOffer: number,
  ) => {
    if (!rideId) return;
    setSubmissionStates((prev) => ({ ...prev, [rideId]: "submitting" }));
    try {
      const responseType = offer === baseOffer ? "accept" : "counter";
      await handleDriverResponse(
        rideId,
        driverInfo?.phone,
        offer,
        responseType,
      );
      setSubmittedOffers((prev) => ({ ...prev, [rideId]: offer }));
      setSubmissionStates((prev) => ({ ...prev, [rideId]: "submitted" }));
      setIncomingRides((prev) =>
        prev.map((r) =>
          r.rideId === rideId ? { ...r, status: "submitted" } : r,
        ),
      );
    } catch (error) {
      setSubmissionStates((prev) => ({ ...prev, [rideId]: "idle" }));
    }
  };

  const handleSelect = (
    rideId: string,
    progress: number,
    msLeft: number,
    rideData: any,
  ) => {
    rideTrayRef.current?.open(
      rideId,
      progress,
      msLeft,
      submittedOffers[rideId] ?? null,
      submissionStates[rideId] ?? "idle",
      rideData,
    );
  };

  const renderScreen = () => {
    switch (activeScreen) {
      default:
        return (
          <DriverHome
            online={online}
            isConnecting={isConnecting}
            incomingRides={incomingRides}
            submittedOffers={submittedOffers}
            onRideSelect={handleSelect}
            onRideExpire={handleDecline}
            trayPadding={trayHeight}
          />
        );
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <Sidebar ref={sidebarRef} userType="driver" />

      <DriverHeader
        onMenuPress={() => sidebarRef.current?.open()}
        onOpenSettings={() => settingsTrayRef.current?.open()}
        setOnline={(isOnline) => {
          if (isOnline !== online) {
            setOnline(isOnline);
            if (isOnline) {
              driverTrayRef.current?.goOnline();
            } else {
              driverTrayRef.current?.goOffline();
            }
          }
        }}
        setIsConnecting={setIsConnecting}
      />

      <View style={styles.content}>{renderScreen()}</View>

      <DriverSettingsTray ref={settingsTrayRef} onClose={() => {}} />

      <DriverTray
        ref={driverTrayRef}
        onStatusChange={(status) => console.log("Tray Status:", status)}
        onHeightChange={(height) => setTrayHeight(height)}
        onMatch={() => {
          setIncomingRides([]);
          setSubmissionStates({});
          setSubmittedOffers({});
        }}
      />

      <RideRequestTray
        ref={rideTrayRef}
        driverId={driverInfo?.id}
        onOfferSubmitted={handleOfferSubmission}
        onClose={() => {}}
      />

      <DriverFooterNav active={activeScreen} onChange={setActiveScreen} />

      {/* ✅ TRIP CANCELLATION MODAL */}
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
    </View>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
    zIndex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // --- Cancellation Modal Styles ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 1000,
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
