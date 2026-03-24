import { ms, s, vs } from "@/utils/responsive";
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
  onContentHeight?: (h: number) => void;
}

const RideTab: React.FC<TabProps> = ({
  onOpenAdditionalInfo,
  onSwitchToSearching,
  onContentHeight,
}) => {
  const insets = useSafeAreaInsets();
  const { rideData, updateRideData, submitRideBooking } = useRideBooking();

  const [isBooking, setIsBooking] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const OFFER_CONTROL_HEIGHT = vs(60);

  const selectedVehiclePrice =
    rideData.vehiclePrices?.[rideData.vehicleType] || 0;
  const isSelectionComplete =
    !!rideData.vehicleType &&
    !!rideData.paymentMethod &&
    selectedVehiclePrice > 0;

  useEffect(() => {
    const initTab = async () => {
      if (!rideData.vehicleType) {
        updateRideData({ vehicleType: "4seater" });
      }
      // Delaying "Ready" helps ensure the OfferFareControl doesn't "pop" in too abruptly
      setTimeout(() => setIsReady(true), 400);
    };
    initTab();
  }, []);

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
          "We couldn't process your request. Please try again.",
        );
        return;
      }
      updateRideData({ status: "searching" });
      onSwitchToSearching();
    } catch (error) {
      Alert.alert(
        "Connection Problem",
        "We are having trouble connecting right now.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View
      // 🔥 CRITICAL: Removed flex: 1 so the View wrap-fits the content
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, vs(theme.spacing.xl)) },
      ]}
      onLayout={(e) => {
        const height = e.nativeEvent.layout.height;
        // We add a small buffer (vs(10)) to ensure the button isn't too close to the edge
        onContentHeight?.(height);
      }}
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
                        size={ms(14)}
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
          <Wallet size={ms(16)} color={theme.colors.textSecondary} />
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
              size={ms(16)}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerSection}>
        <View
          style={[
            styles.offerContainer,
            !isSelectionComplete && { opacity: 0.5 },
            // 2. Reserve the height immediately
            { minHeight: OFFER_CONTROL_HEIGHT, justifyContent: "center" },
          ]}
          pointerEvents={isSelectionComplete ? "auto" : "none"}
        >
          {/* 3. Check for isReady AND valid pricing */}
          {isReady && selectedVehiclePrice > 0 ? (
            <OfferFareControl
              minOffer={selectedVehiclePrice * 0.8}
              maxOffer={selectedVehiclePrice * 1.5}
              initialOffer={rideData.offer || selectedVehiclePrice}
              recommendedOffer={selectedVehiclePrice}
              onOfferChange={(newOffer) => {
                let type: "poor" | "fair" | "good" = "fair";
                if (newOffer < selectedVehiclePrice) type = "poor";
                else if (newOffer > selectedVehiclePrice) type = "good";
                updateRideData({ offer: newOffer, offerType: type });
              }}
            />
          ) : (
            /* 4. Placeholder View keeps the "Find Ride" button in position */
            <View style={{ height: OFFER_CONTROL_HEIGHT }} />
          )}
        </View>
        <View style={{ paddingHorizontal: s(theme.spacing.md) }}>
          <IRButton
            title={
              isBooking
                ? ""
                : `Find ${rideTypes.find((t) => t.id === rideData.vehicleType)?.label || "Ride"} Drift`
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
    // flex: 1 removed to allow content-based height
    backgroundColor: theme.colors.surface,
  },
  mainContent: {
    // Ensure content stays together
  },
  carouselWrapper: { position: "relative" },
  leftFade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: s(30),
    zIndex: 1,
  },
  rightFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: s(30),
    zIndex: 1,
  },
  rideTypesCarousel: {
    paddingHorizontal: s(theme.spacing.md),
    paddingVertical: vs(theme.spacing.md),
    gap: s(theme.spacing.sm),
  },
  rideTypeWrapper: { width: s(140) },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: s(theme.spacing.md),
    paddingVertical: vs(theme.spacing.sm),
  },
  paymentSection: { flexDirection: "row", gap: s(theme.spacing.lg) },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    paddingHorizontal: s(theme.spacing.md),
    marginTop: vs(theme.spacing.xs),
  },
  sectionHeaderText: {
    fontSize: ms(11),
    fontWeight: "800",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: s(1),
  },
  radioItem: { flexDirection: "row", alignItems: "center", gap: s(8) },
  radioOuter: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: theme.colors.primary },
  radioInner: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: ms(14),
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  infoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(theme.spacing.sm),
    paddingVertical: vs(6),
    borderRadius: ms(20),
  },
  infoText: {
    fontSize: ms(13),
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginRight: s(4),
  },
  textPrimary: { color: theme.colors.text },
  footerSection: {
    marginTop: vs(theme.spacing.sm),
  },
  offerContainer: {
    paddingBottom: vs(theme.spacing.md),
  },
});

export default RideTab;
