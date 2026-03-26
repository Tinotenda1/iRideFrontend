// app/passenger/components/RideTypeCard.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../constants/theme";
import { createStyles, typedTypography } from "../../../utils/styles";

interface RideTypeCardProps {
  icon: string;
  title: React.ReactNode;
  price: string | number;
  selected: boolean;
  onPress: () => void;
}

const RideTypeCard: React.FC<RideTypeCardProps> = ({
  icon,
  title,
  price,
  selected,
  onPress,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Selection Checkmark */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Ionicons
            name="checkmark-circle"
            size={ms(20)}
            color={theme.colors.primary}
          />
        </View>
      )}

      {/* LEFT COLUMN: Clean Car Image */}
      <View style={styles.imageContainer}>
        <Image
          source={icon as any}
          style={[styles.carImage, selected && styles.carImageSelected]}
          resizeMode="contain"
        />
      </View>

      {/* RIGHT COLUMN: Premium Typography */}
      <View style={styles.details}>
        <Text
          numberOfLines={1}
          style={[styles.titleText, selected && styles.textActive]}
        >
          {title}
        </Text>

        <Text
          numberOfLines={1}
          style={[styles.priceText, selected && styles.priceTextSelected]}
        >
          ${price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = createStyles({
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: s(135),
    height: vs(90),
    borderRadius: ms(20),
    paddingHorizontal: s(8),
    marginRight: s(10),
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: ms(10),
    elevation: 1,
  },
  cardUnselected: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardSelected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowOpacity: 0.15,
  },
  imageContainer: {
    width: s(65),
    alignItems: "center",
    justifyContent: "center",
  },
  carImage: {
    width: s(60),
    height: vs(45),
    opacity: 0.85,
  },
  carImageSelected: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  details: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: s(8),
  },
  titleText: {
    ...typedTypography.caption,
    fontSize: ms(13),
    fontWeight: "500",
    color: theme.colors.textSecondary,
    marginBottom: vs(2),
  },
  priceText: {
    ...typedTypography.body,
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: ms(16),
    letterSpacing: s(-0.5),
  },
  priceTextSelected: {
    color: theme.colors.primary,
  },
  textActive: {
    color: theme.colors.text,
  },
  selectedIndicator: {
    position: "absolute",
    top: vs(-8),
    right: s(-4),
    backgroundColor: "#FFF",
    borderRadius: ms(50),
    zIndex: 10,
  },
});

export default RideTypeCard;
