// app/passenger/hooks/useRideUIController.ts

import { useEffect, useRef } from "react";
import { useRideBooking } from "../context/RideBookingContext";

/**
 * Maps backend/context ride status to Tray tabs
 */
const STATUS_TO_TAB: Record<string, any> = {
  idle: "input",
  booking: "booking",
  searching: "searching",
  matched: "matched",
  arrived: "matched",
  on_trip: "on_trip",
  completed: "input",
  on_rating: "input",
};

export const useRideUIController = (trayRef: any) => {
  const { rideData } = useRideBooking();

  const lastAppliedState = useRef<string | null>(null);

  useEffect(() => {
    const status = rideData.status || "idle";

    const targetTab = STATUS_TO_TAB[status];

    if (!targetTab || !trayRef?.current) return;

    /**
     * Prevent duplicate transitions
     */
    if (lastAppliedState.current === status) {
      return;
    }

    lastAppliedState.current = status;

    console.log("🎮 UI Controller →", status, "→", targetTab);

    switch (targetTab) {
      case "input":
        trayRef.current.switchToInput();
        break;

      case "booking":
        trayRef.current.switchToRide();
        break;

      case "searching":
        trayRef.current.switchToSearching();
        break;

      case "matched":
        trayRef.current.switchToMatched();
        break;

      case "on_trip":
        trayRef.current.switchToMatched(); // keeps same slot
        break;

      default:
        trayRef.current.switchToInput();
        break;
    }
  }, [rideData.status, trayRef]);
};
