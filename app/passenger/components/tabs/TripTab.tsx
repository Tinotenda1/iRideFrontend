// app/passenger/components/tabs/TripTab.tsx
import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRideBooking } from "../../../../app/context/RideBookingContext";
import { ActionConfirmationModal } from "../../../../components/ActionConfirmationModal";
import CancelButton from "../../../../components/CancelButton";
import { CancelRideTray } from "../../../../components/CancelRideTray";
import { IRAvatar } from "../../../../components/IRAvatar";
import { IRButton } from "../../../../components/IRButton";
import TripStatusModal from "../../../../components/TripStatusModal";
import { theme } from "../../../../constants/theme";
import { getApiBaseUrl } from "../../../../utils/api";
import { getUserInfo } from "../../../../utils/storage";
import { createStyles } from "../../../../utils/styles";
import { subscribeToRideCancellation } from "../../socketConnectionUtility/passengerSocketService";

interface TripTabProps {
  onCancel: () => void;
  onExpand?: (isExpanded: boolean) => void;
  onContentHeight?: (h: number) => void; // Added for dynamic height
}

const PREDEFINED_REASONS = [
  "Wait time too long",
  "Driver is not moving",
  "Driver asked me to cancel",
  "Incorrect pickup address",
  "No longer need the ride",
  "Emergency / Drop me here",
];

const TripTab: React.FC<TripTabProps> = ({
  onCancel,
  onExpand,
  onContentHeight,
}) => {
  const { currentRide, rideData } = useRideBooking();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [remoteCancelData, setRemoteCancelData] = useState<{
    reason: string;
    cancelledBy: string;
  } | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isOn_trip =
    rideData.status === "on_trip" || currentRide?.status === "on_trip";
  const driver = currentRide?.driver;
  const vehicle = currentRide?.driver?.vehicle;
  const profilePic = driver?.profilePic;
  const totalTrips = driver?.totalTrips;
  const rating = currentRide?.driver?.rating;
  const vehiclePic = vehicle?.pic;
  const vehicleLicencePlate = vehicle?.licensePlate;
  const displayOffer = currentRide?.offer;
  const [showDropModal, setShowDropModal] = useState(false);

  const resolveImagePath = (path: string | null | undefined) => {
    if (!path) return undefined;
    if (
      path.startsWith("http") ||
      path.startsWith("file://") ||
      path.startsWith("content://")
    ) {
      return { uri: path };
    }
    try {
      const baseUrl = getApiBaseUrl().replace(/\/$/, "");
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      return { uri: `${baseUrl}${cleanPath}` };
    } catch (e) {
      return { uri: path };
    }
  };

  useEffect(() => {
    isMounted.current = true;
    subscribeToRideCancellation((data) => {
      if (data.cancelledBy === "driver" && isMounted.current) {
        setRemoteCancelData(data);
      }
    });
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleToggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    onExpand?.(nextState);

    Animated.timing(fadeAnim, {
      toValue: nextState ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirmCancel = useCallback(async () => {
    if (!isMounted.current || isCancelling) return;
    setIsCancelling(true);
    try {
      const userInfo = await getUserInfo();
      const formattedPhone = userInfo?.phone?.replace("+", "") || "";

      await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": userInfo?.currentDeviceId || userInfo?.deviceId || "",
        },
        body: JSON.stringify({
          userPhone: formattedPhone,
          reason:
            cancelReason ||
            (isExpanded
              ? "Passenger requested immediate stop (Drop me here)"
              : "No reason provided."),
        }),
      });

      onCancel();
      if (isMounted.current) {
        setShowCancelModal(false);
        setIsExpanded(false);
      }
    } catch (error) {
      console.error("❌ Cancel failed:", error);
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, cancelReason, isExpanded]);

  const handleDropMeHere = useCallback(async () => {
    if (!isMounted.current || isCancelling) return;

    const rId = currentRide?.rideId || rideData?.activeTrip?.rideId;
    if (!rId) {
      Alert.alert("Error", "Could not find an active trip ID.");
      return;
    }

    setIsCancelling(true);
    try {
      const userInfo = await getUserInfo();
      const formattedPhone = userInfo?.phone?.replace("+", "") || "";

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/rides/passenger_ends_ride`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-id":
              userInfo?.currentDeviceId || userInfo?.deviceId || "",
          },
          body: JSON.stringify({
            userPhone: formattedPhone,
            rideId: rId,
            completedBy: "passenger",
            reason: "Drop me here (Immediate stop requested)",
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setShowDropModal(false);
        onCancel();
        if (isMounted.current) setIsExpanded(false);
      } else {
        Alert.alert("Request Failed", "The server could not end the trip.");
      }
    } catch (error) {
      console.error("❌ Drop me here failed:", error);
      Alert.alert(
        "Connection Error",
        "Please check your internet connection and try again.",
      );
    } finally {
      if (isMounted.current) setIsCancelling(false);
    }
  }, [isCancelling, onCancel, currentRide, rideData]);

  const handleCallDriver = () => {
    if (!driver?.phone) {
      Alert.alert("Error", "Passenger phone number is not available.");
      return;
    }
    const phoneNumber = "+" + driver.phone.replace(/\D/g, "");
    let url =
      Platform.OS === "android"
        ? `tel:${phoneNumber}`
        : `telprompt:${phoneNumber}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert("Error", "Unable to open dialer.");
      })
      .catch((err) => console.error("Dialer error:", err));
  };

  const handleWhatsAppDriver = async () => {
    try {
      if (!driver?.phone) {
        Alert.alert("Error", "Driver phone number is not available.");
        return;
      }
      const phoneNumber = "+" + driver.phone.replace(/\D/g, "");
      const userInfo = await getUserInfo();
      const passengerName = userInfo
        ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim()
        : "Passenger";

      const message = encodeURIComponent(`DRIFT Passenger - ${passengerName}:`);
      const url = `https://wa.me/${phoneNumber}?text=${message}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else
        Alert.alert(
          "WhatsApp not installed",
          "Please install WhatsApp to send a message.",
        );
    } catch (err) {
      console.error("WhatsApp error:", err);
    }
  };

  const handleCloseRemoteModal = () => {
    setRemoteCancelData(null);
    onCancel();
  };

  if (!driver?.name) {
    return (
      <View
        style={[styles.container, styles.center]}
        onLayout={(e) => onContentHeight?.(e.nativeEvent.layout.height)}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loadingText}>Connecting to driver...</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container]}
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        onContentHeight?.(height);
      }}
    >
      <View style={styles.topSection}>
        {isOn_trip && (
          <View style={styles.headerRow}>
            <View style={styles.ongoingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.ongoingText}>Trip in Progress</Text>
            </View>
            <TouchableOpacity
              style={styles.expandToggle}
              onPress={handleToggleExpand}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-up"}
                size={ms(24)}
                color="#475569"
              />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.driverRow}>
          <View style={styles.driverInfo}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                profilePic &&
                setPreviewImage(resolveImagePath(profilePic)?.uri || null)
              }
            >
              <IRAvatar source={resolveImagePath(profilePic)} size={ms(52)} />
            </TouchableOpacity>
            <View>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.ratingBadge}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const safeRating = typeof rating === "number" ? rating : 5;
                  return (
                    <Ionicons
                      key={i}
                      name="star"
                      size={ms(12)}
                      color={i < Math.round(safeRating) ? "#FFC107" : "#E5E7EB"}
                      style={{ marginRight: s(1) }}
                    />
                  );
                })}
                <Text style={styles.ratingText}>
                  {typeof rating === "number" ? rating.toFixed(2) : "5.00"}
                </Text>
                <Text style={styles.tripCount}> • {totalTrips} rides</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.secondary },
            ]}
            onPress={handleCallDriver}
          >
            <Ionicons name="call" size={ms(22)} color={theme.colors.surface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.primary },
            ]}
            activeOpacity={0.7}
            onPress={handleWhatsAppDriver}
          >
            <Ionicons
              name="logo-whatsapp"
              size={ms(22)}
              color={theme.colors.surface}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.vehicleRow}>
          <View style={styles.vehicleInfo}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                vehiclePic &&
                setPreviewImage(resolveImagePath(vehiclePic)?.uri || null)
              }
            >
              <IRAvatar
                source={resolveImagePath(vehiclePic)}
                variant="rounded"
                size={ms(50)}
                style={{ backgroundColor: theme.colors.background }}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.carModel}>
                {vehicle?.color} {vehicle?.model}
              </Text>
              <View style={styles.plateBadge}>
                <Text style={styles.plateNumber}>
                  {vehicleLicencePlate || "No Plate"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              ${Number(displayOffer).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {!isOn_trip ? (
          <CancelButton
            label="Cancel ride"
            onPress={() => setShowCancelModal(true)}
          />
        ) : (
          /* Change: Adjusted padding and gap for the expanded state */
          <View
            style={{ gap: vs(10), paddingBottom: isExpanded ? vs(5) : vs(20) }}
          >
            <IRButton
              title="Safety Toolkit"
              variant="outline"
              onPress={() => {}}
              leftIcon={
                <Ionicons
                  name="shield-checkmark"
                  size={ms(20)}
                  color={theme.colors.secondary}
                />
              }
              style={styles.safetyButton}
              textStyle={styles.safetyButtonText}
              borderColor={theme.colors.border}
            />
            {isExpanded && (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [vs(10), 0],
                      }),
                    },
                  ],
                }}
              >
                <IRButton
                  title="Drop me here"
                  variant="outline"
                  onPress={() => setShowDropModal(true)}
                  loading={isCancelling}
                  borderColor={theme.colors.red}
                  style={styles.dropButton}
                  textStyle={styles.dropButtonText}
                />
              </Animated.View>
            )}
          </View>
        )}
      </View>

      {/* Image preview modal (unchanged) */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.fullScreenContainer}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <BlurView
            intensity={90}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.imageContent}>
            <View style={styles.modalImageWrapper}>
              {previewImage && (
                <Image
                  source={{ uri: previewImage }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity
              style={styles.closeImageBtn}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close" size={ms(28)} color="white" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cancel ride tray */}
      <CancelRideTray
        visible={showCancelModal}
        loading={isCancelling}
        type="passenger"
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
      />

      {/* Remote cancel notification using the reusable TripStatusModal */}
      <TripStatusModal
        visible={!!remoteCancelData}
        type="cancellation"
        title="Trip Cancelled"
        message={
          remoteCancelData?.reason
            ? `The driver cancelled this request: ${remoteCancelData.reason}`
            : "The driver has cancelled this request. Please try booking another ride."
        }
        onClose={handleCloseRemoteModal}
      />

      {/* Drop modal – already uses ActionConfirmationModal, which should handle safe area internally */}
      <ActionConfirmationModal
        visible={showDropModal}
        title="End trip early?"
        subtitle="Are you sure you want the driver to stop here? You will be charged for the distance covered."
        confirmText="Yes, Drop Me Here"
        confirmVariant="danger"
        loading={isCancelling}
        onConfirm={handleDropMeHere}
        onClose={() => setShowDropModal(false)}
      />
    </View>
  );
};

const styles = createStyles({
  container: {
    // Removed flex: 1 to allow dynamic height
    paddingTop: vs(15),
    backgroundColor: theme.colors.surface,
    paddingHorizontal: s(16),
    // paddingBottom is applied dynamically via insets
  },
  topSection: {
    // Removed flex: 1
    marginBottom: vs(10),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    //marginBottom: vs(12),
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: vs(40),
  },
  loadingText: {
    marginTop: vs(10),
    color: "#94a3b8",
    fontSize: ms(14),
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
  },
  driverInfo: { flexDirection: "row", alignItems: "center", gap: s(10) },
  driverName: { fontSize: ms(18), fontWeight: "700", color: "#1e293b" },
  ratingBadge: { flexDirection: "row", alignItems: "center", marginTop: vs(2) },
  ratingText: {
    fontSize: ms(13),
    fontWeight: "700",
    marginLeft: s(4),
    color: "#1e293b",
  },
  tripCount: { fontSize: ms(13), color: "#94a3b8", fontWeight: "500" },
  iconButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: vs(10),
  },
  vehicleInfo: { flexDirection: "row", alignItems: "center", gap: s(12) },
  pulseDot: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: theme.colors.primary,
    marginRight: s(6),
  },
  safetyButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: ms(16),
    borderWidth: 1,
    height: vs(56),
    justifyContent: "center",
  },
  safetyButtonText: { fontSize: ms(16), fontWeight: "700", color: "#475569" },
  dropButton: {
    backgroundColor: theme.colors.background,
    height: vs(56),
    borderRadius: ms(16),
    marginTop: vs(10),
  },
  dropButtonText: {
    color: theme.colors.red,
    fontWeight: "700",
    fontSize: ms(16),
  },
  carModel: {
    fontSize: ms(15),
    fontWeight: "600",
    color: "#475569",
    marginBottom: vs(2),
  },
  plateBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(6),
    paddingVertical: vs(2),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: "flex-start",
  },
  plateNumber: {
    fontSize: ms(11),
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  pricePill: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(12),
  },
  priceText: {
    fontSize: ms(18),
    fontWeight: "800",
    color: theme.colors.primary,
  },
  footer: {
    //marginTop: vs(10),
    //paddingBottom: vs(20),
  },
  ongoingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    alignSelf: "flex-start",
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(20),
  },
  ongoingText: {
    fontSize: ms(12),
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  expandToggle: { padding: s(4) },

  fullScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImageWrapper: {
    width: "90%",
    height: "70%",
    borderRadius: ms(20),
    overflow: "hidden",
  },
  fullScreenImage: { width: "100%", height: "100%" },
  closeImageBtn: {
    position: "absolute",
    top: vs(60),
    right: s(20),
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: theme.colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TripTab;
