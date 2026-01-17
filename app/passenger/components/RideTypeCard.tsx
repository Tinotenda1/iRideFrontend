// components/RideTypeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../constants/theme';
import { createStyles, typedTypography } from '../../../utils/styles';

interface RideTypeCardProps {
  icon: string;          // car image (require path)
  seats: number;
  price: string | number;
  selected: boolean;
  onPress: () => void;
}

const RideTypeCard: React.FC<RideTypeCardProps> = ({
  icon,
  seats,
  price,
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={1}
    >
      {/* LEFT COLUMN: CAR IMAGE */}
      <Image source={icon as any} style={styles.carImage} resizeMode="contain" />

      {/* RIGHT COLUMN: vertical stack */}
      <View style={styles.details}>
        {/* Top row: seats */}
        <View style={styles.row}>
          <Ionicons
            name="people-outline"
            size={16}
            color={selected ? theme.colors.text : theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.seatText, selected && { color: theme.colors.text }]}
          >
            {seats}
          </Text>
        </View>

        {/* Bottom row: price */}
        <View style={styles.row}>
          <Text style={[styles.price, selected && { color: theme.colors.primary, fontSize: 16}]}>
            ${price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = createStyles({
  card: {
    flexDirection: 'row',   // 2 columns
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },

  cardSelected: {
    borderColor: theme.colors.primary,
  },

  carImage: {
    width: 80,
    height: 80,
  },

  details: {
    flex: 1,
    flexDirection: 'column', // stack rows vertically
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    minWidth: 100, 
  },

  seatText: {
    ...typedTypography.caption,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  price: {
    ...typedTypography.caption,
    fontWeight: '900',
    color: theme.colors.primary,
    fontSize: 14,   
  },
});

export default RideTypeCard;
