// app/driver/index.tsx
import { getUserInfo } from "@/utils/storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native"; // Added ActivityIndicator

import TripStatusModal, { ModalType } from "../../components/TripStatusModal";
import { useSessionRestoration } from "../services/useSessionRestoration";
import DriverHeader from "./components/DriverHeader";
import Sidebar from "./components/DriverSideBar";
import DriverSettingsTray from "./components/trays/DriverSettingsTray";
import DriverTray from "./components/trays/DriverTray";
import RideRequestTray from "./components/trays/RideRequestTray";
import { watchDriverLocation } from "./driverLocationUtility/driverLocation";
import DriverHome from "./screens/DriverHome";

import {
  disconnectDriver,
  handleDriverResponse,
  onNewRideRequest,
  onReconnectState,
  onStatusChange,
} from "./socketConnectionUtility/driverSocketService";

type Screen = "home" | "wallet" | "revenue" | "notifications";
export type SubmissionState = "idle" | "submitting" | "submitted";

const DriverDashboard: React.FC = () => {
  const router = useRouter();
  const sidebarRef = useRef<any>(null);
  const settingsTrayRef = useRef<any>(null);
  const rideTrayRef = useRef<any>(null);
  const driverTrayRef = useRef<any>(null);
  const [manualOffline, setManualOffline] = useState(true);

  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>("home");
  const [incomingRides, setIncomingRides] = useState<any[]>([]);
  const [online, setOnline] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [trayHeight, setTrayHeight] = useState(0); // ✅ Use the restoration hook
  const { restoreSession } = useSessionRestoration();
  const locationWatcherRef = useRef<(() => void) | null>(null);

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
  >({}); // 1. Unified Initialization Logic

  // Start tracking driver location
  useEffect(() => {
    // Start tracking when driver goes online
    if (online && !locationWatcherRef.current) {
      console.log("📍 Starting driver GPS tracking");

      locationWatcherRef.current = watchDriverLocation(
        (location) => {
          /* // Optional: useful debug
          console.log(
            "📡 Driver location update:",
            location.latitude,
            location.longitude,
          );*/
        },
        (error) => {
          console.warn("⚠️ Driver location error:", error);
        },
      );
    }

    // Stop tracking when offline
    if (!online && locationWatcherRef.current) {
      console.log("🛑 Stopping driver GPS tracking");
      locationWatcherRef.current();
      locationWatcherRef.current = null;
    }
  }, [online]);

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
        setDriverInfo(user); // ✅ Extracting logic to the service module
      } catch (err) {
        console.error("❌ Driver Init Error:", err);
      } finally {
        setLoading(false);
      }
    };

    initDriver();
  }, []);

  useEffect(() => {
    // Make sure the driver socket is connected first
    const unsubscribe = onReconnectState((data) => {
      console.log("🔔 onReconnectState callback triggered");
      if (data) {
        console.log("🔄 Reconnect Data Received:", data);
        console.log("➡️ Restoring session...");
        restoreSession(data);

        if (data.activeTrip) {
          console.log("⚠️ Active trip detected, clearing local ride states");
          setIncomingRides([]);
          setSubmissionStates({});
          setSubmittedOffers({});
        } else {
          console.log("ℹ️ No active trip, skipping ride state reset");
        }
      } else {
        console.log("❌ No data received on reconnect");
      }
    });

    return () => unsubscribe();
  }, [restoreSession]);

  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
    if (driverTrayRef.current) {
      driverTrayRef.current.goOnline();
    }
  }; // socket listener for new ride requests

  useEffect(() => {
    if (!online) return;

    const unsubscribe = onNewRideRequest((newRide: any) => {
      setIncomingRides((prev) => {
        if (prev.find((r) => r.rideId === newRide.rideId)) return prev;
        return [...prev, newRide];
      });

      const priorityDuration = newRide.priorityDurationMs || 30000;
      // ✅ Tray always receives same parameters
      rideTrayRef.current?.open(
        newRide.rideId,
        priorityDuration,
        priorityDuration,
        //10000, // For testing purposes, we can set this to a fixed value or use the actual priorityDuration
        //5000, // For testing purposes, we can set this to a fixed value or use the actual remainingMs
        submittedOffers[newRide.rideId] ?? null,
        submissionStates[newRide.rideId] ?? "idle",
        newRide,
      );
    });

    return () => unsubscribe();
  }, [online, submittedOffers, submissionStates]);

  useEffect(() => {
    return () => {
      disconnectDriver();

      if (locationWatcherRef.current) {
        locationWatcherRef.current();
        locationWatcherRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onStatusChange((s) => {
      setOnline(s === "connected");
      setIsConnecting(s === "connecting" || s === "reconnecting");
      if (s === "connected") driverTrayRef.current?.goOnline();
      if (s === "offline") driverTrayRef.current?.goOffline();
    });
    return () => unsubscribe();
  }, []);

  const handleDecline = (ride: any) => {
    setIncomingRides((prev) =>
      prev.filter((r) => r.rideId !== (ride.rideId || ride)),
    ); // ✅ Close tray when card expires/slides out
    rideTrayRef.current?.close();
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

  const handleSelect = useCallback(
    (
      rideId: string,
      rideData: any,
      priorityDurationMs: number,
      remainingMs: number,
    ) => {
      // ✅ Always pass: rideId, priorityDuration, remainingMs, submittedOffer, submissionState, rideData
      rideTrayRef.current?.open(
        rideId,
        priorityDurationMs,
        remainingMs,
        submittedOffers[rideId] ?? null,
        submissionStates[rideId] ?? "idle",
        rideData,
      );
    },
    [submittedOffers, submissionStates],
  );

  const renderScreen = () => {
    switch (activeScreen) {
      default:
        return (
          <DriverHome
            rideTrayRef={rideTrayRef}
            online={online}
            isConnecting={isConnecting}
            incomingRides={incomingRides}
            submittedOffers={submittedOffers}
            onRideSelect={handleSelect}
            onRideExpire={handleDecline}
            trayPadding={trayHeight}
            manuallyOffline={manualOffline}
            setManuallyOffline={setManualOffline}
            isOnline={online}
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
              setManualOffline(false); // ✅ reset manual offline if they go online
              driverTrayRef.current?.goOnline();
            } else {
              driverTrayRef.current?.goOffline();
            }
          }
        }}
        setIsConnecting={setIsConnecting}
        setManualOffline={setManualOffline}
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
          rideTrayRef.current?.close();
        }}
        isOnline={online}
      />

      <RideRequestTray
        ref={rideTrayRef}
        driverId={driverInfo?.id}
        onOfferSubmitted={handleOfferSubmission}
        onClose={() => {}}
      />
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
