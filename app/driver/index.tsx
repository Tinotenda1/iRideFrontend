import { getUserInfo } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native"; // Added ActivityIndicator

import TripStatusModal, { ModalType } from "../../components/TripStatusModal";
import { useSessionRestoration } from "../services/useSessionRestoration"; // ✅ Import the new hook
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
  onRemoveRideRequest,
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

  // ✅ Use the restoration hook
  const { restoreSession, isRestoring } = useSessionRestoration();
  const hasInitialized = useRef(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: "cancellation" as ModalType,
    title: "",
    message: "",
  });

  const [submissionStates, setSubmissionStates] = useState<
    Record<string, SubmissionState>
  >({});
  const [submittedOffers, setSubmittedOffers] = useState<
    Record<string, number>
  >({});

  // 1. Unified Initialization Logic
  useEffect(() => {
    const initDriver = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      setLoading(true);
      try {
        const user = await getUserInfo();
        if (!user) {
          router.replace("/auth/get-started" as any);
          return;
        }
        setDriverInfo(user);

        // ✅ Extracting logic to the service module
        await restoreSession();
      } catch (err) {
        console.error("❌ Driver Init Error:", err);
      } finally {
        setLoading(false);
      }
    };

    initDriver();
  }, [restoreSession, router]);

  // 2. Existing Handlers
  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
    if (driverTrayRef.current) {
      driverTrayRef.current.goOnline();
    }
  };

  // 3. Socket Listeners
  useEffect(() => {
    if (!online) return;
    const unsubscribe = onRemoveRideRequest((rideId) => {
      console.log("📡 Driver - Ride removed:", rideId);
      setIncomingRides((prev) => prev.filter((r) => r.rideId !== rideId));
    });
    return () => unsubscribe();
  }, [online]);

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
    return () => disconnectDriver();
  }, []);

  // 4. Status Polling
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
    setIncomingRides((prev) =>
      prev.filter((r) => r.rideId !== (ride.rideId || ride)),
    );
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

  // ✅ Added Loading State UI
  if (loading || isRestoring) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

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
      <TripStatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />
    </View>
  );
};

export default DriverDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, backgroundColor: "transparent", zIndex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
