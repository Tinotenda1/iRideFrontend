// components/trays/InputTray.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  BackHandler,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRideBooking } from "../../../context/RideBookingContext";
import LocationSearch, { Place } from "../map/LocationSearch";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = windowHeight * 0.95; // Slightly higher for that full-screen Bolt feel

interface InputTrayProps {
  activeField: "pickup" | "destination";
  onClose?: () => void;
}

const InputTray = forwardRef<any, InputTrayProps>(
  ({ activeField, onClose }, ref) => {
    const { rideData, updateRideData } = useRideBooking();
    const [isOpen, setIsOpen] = useState(false);

    const [inputText, setInputText] = useState(
      activeField === "pickup"
        ? rideData.pickupLocation?.name || ""
        : rideData.destination?.name || "",
    );

    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleClose();
          return true;
        },
      );
      return () => backHandler.remove();
    }, [isOpen]);

    useImperativeHandle(ref, () => ({
      open: () => {
        setInputText("");
        setIsOpen(true);
      },
      close: () => {
        handleClose();
      },
    }));

    const handleClose = () => {
      setIsOpen(false);
      onClose?.();
    };

    const handlePlaceSelect = (place: Place | null) => {
      if (!place) return;

      if (activeField === "pickup") {
        updateRideData({ pickupLocation: place });
      } else {
        // ✅ Add status: "active" here to trigger the UI Controller
        console.log(`[InputTray] Destination selected:`, place);
        updateRideData({
          destination: place,
          status: "active",
        });
      }
      handleClose();
    };

    if (!isOpen) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.container}>
          {/* Premium Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.label}>
              {activeField === "pickup" ? "Pickup Location" : "Where to?"}
            </Text>
          </View>

          {/* Content Section */}
          <View style={styles.searchWrapper}>
            <LocationSearch
              destination={inputText}
              onDestinationChange={setInputText}
              onPlaceSelect={handlePlaceSelect}
              placeholder={
                activeField === "pickup"
                  ? "Search pickup point"
                  : "Enter destination"
              }
              autoFocus={true}
            />
          </View>
        </View>
      </>
    );
  },
);

InputTray.displayName = "InputTray";
export default InputTray;

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.4)", // Slightly more blue-tinted dark overlay
    zIndex: 998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32, // Large rounded corners
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 999,
    // Premium Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 25,
  },
  dragHandle: {
    width: 38,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 22, // Larger, bold Bolt-style title
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  searchWrapper: {
    flex: 1,
    // LocationSearch handles its own internal styling,
    // but this wrapper ensures proper spacing.
  },
});
