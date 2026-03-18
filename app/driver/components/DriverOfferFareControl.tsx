// app/passenger/components/DriverOfferFareControl.tsx
import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OfferFareControlProps {
  minOffer: number;
  maxOffer: number;
  initialOffer: number;
  onOfferChange: (offer: number) => void;
}

const STEP = 0.5;

export const OfferFareControl = ({
  minOffer,
  maxOffer,
  initialOffer,
  onOfferChange,
}: OfferFareControlProps) => {
  const [offer, setOffer] = useState(initialOffer);

  useEffect(() => {
    setOffer(initialOffer);
  }, [initialOffer]);

  useEffect(() => {
    onOfferChange(offer);
  }, [offer]);

  const decreaseOffer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (offer <= minOffer) return;

    setOffer((prev) => {
      const nextValue = prev - STEP;
      const strictMin = Math.ceil(minOffer * 2) / 2;
      const roundedValue = Math.max(strictMin, Math.round(nextValue * 2) / 2);
      return Number(roundedValue.toFixed(2));
    });
  };

  const increaseOffer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (offer >= maxOffer) return;

    setOffer((prev) => {
      const nextValue = prev + STEP;
      const strictMax = Math.floor(maxOffer * 2) / 2;
      const roundedValue = Math.min(strictMax, Math.round(nextValue * 2) / 2);
      return Number(roundedValue.toFixed(2));
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.boltPill}>
        <TouchableOpacity
          style={[
            styles.adjustBtn,
            offer <= minOffer && styles.disabledOpacity,
          ]}
          onPress={decreaseOffer}
          activeOpacity={0.6}
        >
          <Text style={styles.adjustText}>−</Text>
        </TouchableOpacity>

        <View style={styles.offerDisplay}>
          <Text style={styles.currencySymbol}>$</Text>
          <Text style={styles.offerValue}>{offer.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.adjustBtn,
            offer >= maxOffer && styles.disabledOpacity,
          ]}
          onPress={increaseOffer}
          activeOpacity={0.6}
        >
          <Text style={styles.adjustText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  boltPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: ms(30),
    paddingHorizontal: s(8),
    width: "80%",
    justifyContent: "space-between",
  },
  adjustBtn: {
    width: s(68),
    height: vs(48),
    backgroundColor: theme.colors.background,
    borderRadius: ms(30),
    alignItems: "center",
    justifyContent: "center",
  },
  adjustText: {
    fontSize: ms(24),
    fontWeight: "400",
    color: "#0f172a",
  },
  disabledOpacity: {
    opacity: 0.2,
  },
  offerDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    fontSize: ms(18),
    fontWeight: "600",
    color: "#0f172a",
    marginRight: s(2),
    marginTop: vs(2),
  },
  offerValue: {
    fontSize: ms(26),
    fontWeight: "700",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
});
