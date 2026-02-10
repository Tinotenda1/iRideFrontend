// app/passenger/components/tabs/RideTab.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Wallet } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IRButton } from "../../../../components/IRButton";
import { theme } from "../../../../constants/theme";
import { createStyles } from "../../../../utils/styles";
import { useRideBooking } from "../../../context/RideBookingContext";
import { OfferFareControl } from "../PassengerOfferFareControl";
import RideTypeCard from "../RideTypeCard";

interface TabProps {
  id: string;
  onOpenAdditionalInfo: () => void;
  onSwitchToSearching: () => void;
}

const RideTab: React.FC<TabProps> = ({
  onOpenAdditionalInfo,
  onSwitchToSearching,
}) => {
  const insets = useSafeAreaInsets();
  const { rideData, updateRideData, submitRideBooking, fetchPrices } =
    useRideBooking();

  const [isBooking, setIsBooking] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Computed values
  const selectedVehiclePrice =
    rideData.vehiclePrices?.[rideData.vehicleType] || 0;
  const isSelectionComplete =
    !!rideData.vehicleType && !!rideData.paymentMethod;

  // ✅ LOGGING: Observe prices arriving in the tab
  useEffect(() => {
    if (
      rideData.vehiclePrices &&
      Object.keys(rideData.vehiclePrices).length > 0
    ) {
      console.log(
        "[RideTab] Prices available in state:",
        rideData.vehiclePrices,
      );
    }
  }, [rideData.vehiclePrices]);

  // 1. INITIALIZATION & PRICE FETCHING
  useEffect(() => {
    const initTab = async () => {
      // Set default vehicle if none selected
      if (!rideData.vehicleType) {
        updateRideData({ vehicleType: "4seater" });
      }

      if (rideData.pickupLocation && rideData.destination) {
        try {
          setIsFetchingPrices(true);
          // fetchPrices now updates vehiclePrices in context correctly
          await fetchPrices(rideData.pickupLocation, rideData.destination);
        } catch (error) {
          console.error("Failed to fetch prices:", error);
        } finally {
          setIsFetchingPrices(false);
        }
      }

      setTimeout(() => setIsReady(true), 500);
    };

    initTab();
  }, []);

  // 2. SYNC OFFER WITH SELECTED VEHICLE PRICE
  // This ensures that when prices arrive OR the user switches vehicles,
  // the 'offer' state is updated to the new base price.
  useEffect(() => {
    const currentPrice = rideData.vehiclePrices?.[rideData.vehicleType];
    if (currentPrice && currentPrice > 0) {
      updateRideData({ offer: currentPrice, offerType: "fair" });
    }
  }, [rideData.vehicleType, rideData.vehiclePrices]);

  const rideTypes = useMemo(
    () => [
      {
        id: "4seater",
        icon: require("../../../../assets/cars/4seat.png"),
        label: "4 Seater",
        seats: 4,
      },
      {
        id: "7seater",
        icon: require("../../../../assets/cars/7seat.png"),
        label: "7 Seater",
        seats: 7,
      },
      {
        id: "pickup2seater",
        icon: require("../../../../assets/cars/pickup2.png"),
        label: "2 Seater Pickup",
        seats: 2,
      },
      {
        id: "pickup4seater",
        icon: require("../../../../assets/cars/pickup4.png"),
        label: "4 Seater Pickup",
        seats: 4,
      },
    ],
    [],
  );

  const handleFindRides = async () => {
    try {
      setIsBooking(true);
      const result = await submitRideBooking();
      if (!result) {
        Alert.alert(
          "Error",
          "We couldn't process your request. Please try again. If the issue persists, contact support.",
        );
        return;
      }
      onSwitchToSearching();
    } catch (error) {
      Alert.alert(
        "Connection Issue",
        "Please check your internet and try again.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
      ]}
    >
      <View style={styles.mainContent}>
        <View style={styles.carouselWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rideTypesCarousel}
          >
            {rideTypes.map((type) => (
              <View key={type.id} style={styles.rideTypeWrapper}>
                <RideTypeCard
                  icon={type.icon}
                  title={
                    <>
                      {type.seats}{" "}
                      <Ionicons
                        name="person"
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                    </>
                  }
                  price={
                    isFetchingPrices
                      ? "..."
                      : (rideData.vehiclePrices?.[type.id] ?? 0)
                  }
                  selected={rideData.vehicleType === type.id}
                  onPress={() => updateRideData({ vehicleType: type.id })}
                />
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            colors={[theme.colors.surface, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.leftFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", theme.colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rightFade}
            pointerEvents="none"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Wallet size={16} color={theme.colors.textSecondary} />
          <Text style={styles.sectionHeaderText}>Payment Method</Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.paymentSection}>
            {["ecocash", "cash"].map((method) => (
              <TouchableOpacity
                key={method}
                style={styles.radioItem}
                onPress={() => updateRideData({ paymentMethod: method })}
              >
                <View
                  style={[
                    styles.radioOuter,
                    rideData.paymentMethod === method &&
                      styles.radioOuterSelected,
                  ]}
                >
                  {rideData.paymentMethod === method && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.radioLabel,
                    rideData.paymentMethod === method && styles.textPrimary,
                  ]}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={onOpenAdditionalInfo}
          >
            <Text
              style={[
                styles.infoText,
                rideData.additionalInfo && styles.textPrimary,
              ]}
            >
              Add Info
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View>
        <View
          style={[
            styles.offerContainer,
            !isSelectionComplete && { opacity: 0.5 },
          ]}
          pointerEvents={isSelectionComplete ? "auto" : "none"}
        >
          {isReady && selectedVehiclePrice > 0 && (
            <OfferFareControl
              minOffer={selectedVehiclePrice * 0.8}
              maxOffer={selectedVehiclePrice * 1.5}
              initialOffer={rideData.offer || selectedVehiclePrice}
              onOfferChange={(newOffer) => {
                let type: "poor" | "fair" | "good" = "fair";
                if (newOffer < selectedVehiclePrice) type = "poor";
                else if (newOffer > selectedVehiclePrice) type = "good";
                updateRideData({ offer: newOffer, offerType: type });
              }}
            />
          )}
        </View>
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <IRButton
            title={
              isBooking
                ? ""
                : `Find ${rideTypes.find((t) => t.id === rideData.vehicleType)?.label || "Ride"}`
            }
            onPress={handleFindRides}
            loading={isBooking}
            disabled={isBooking || !isSelectionComplete || isFetchingPrices}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
};

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  mainContent: {
    flex: 1,
  },
  carouselWrapper: {
    position: "relative",
  },
  leftFade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 1,
  },
  rightFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 1,
  },
  rideTypesCarousel: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rideTypeWrapper: {
    width: 140,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  paymentSection: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  infoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  textPrimary: {
    color: theme.colors.text,
  },
  offerContainer: {
    paddingBottom: theme.spacing.sm,
  },
});

export default RideTab;
