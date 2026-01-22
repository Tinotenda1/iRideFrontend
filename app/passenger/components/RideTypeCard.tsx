// app/passenger/components/RideTypeCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../constants/theme';
import { createStyles, typedTypography } from '../../../utils/styles';

interface RideTypeCardProps {
  icon: string; 
  title: string;
  price: string | number;
  selected: boolean;
  onPress: () => void;
}

const RideTypeCard: React.FC<RideTypeCardProps> = ({
  icon, 
  title, // from pricing suggestions in RideTab
  price, // from pricing suggestions in RideTab
  selected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card, 
        selected ? styles.cardSelected : styles.cardUnselected
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* LEFT COLUMN: Pushed to the far left edge */}
      <View style={styles.imageContainer}>
        <Image source={icon as any} style={styles.carImage} resizeMode="contain" />
      </View>

      {/* RIGHT COLUMN: Stacked vertically with plenty of room */}
      <View style={styles.details}>
        <View style={styles.row}>
          <Text
            style={[
              styles.seatText, 
              selected && { color: theme.colors.text, fontWeight: '700' }
            ]}
          >
            {title}
          </Text>
        </View>

        <View style={styles.row}>
          <Text 
            numberOfLines={1} 
            style={[
              styles.price, 
              selected && { color: theme.colors.primary, fontSize: 17 }
            ]}
          >
            ${price}
          </Text>
        </View>
      </View>

      {/* Selection Checkmark */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = createStyles({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    // UNIFORM DIMENSIONS
    width: 140, 
    height: 85,
    paddingLeft: 4, // Scootch image to the left edge
    paddingRight: theme.spacing.sm,
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
    backgroundColor: theme.colors.surface,
    // Soft Bolt-style shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnselected: {
    borderColor: theme.colors.border + '30',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    //backgroundColor: theme.colors.primary + '05',
  },
  imageContainer: {
    width: 70, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  carImage: {
    width: 65,
    height: 45,
  },
  details: {
    flex: 1, 
    justifyContent: 'center',
    paddingLeft: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1,
  },
  seatText: {
    ...typedTypography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  price: {
    ...typedTypography.body,
    fontWeight: '900',
    color: theme.colors.text,
    fontSize: 15,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
});

export default RideTypeCard;