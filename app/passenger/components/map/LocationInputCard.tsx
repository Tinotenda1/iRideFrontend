// app/passenger/components/map/LocationInputCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import { Place } from './LocationSearch';

const PICKUP_ICON = "location-sharp";
const DEST_ICON = "flag";

interface Props {
  pickup: string;
  destination: string;
  onInputFocus: (field: "pickup" | "destination") => void;
  onPickupChange?: (text: string) => void;
  onDestinationChange?: (text: string) => void;
  onPickupSelect?: (place: Place | null) => void;
  onDestinationSelect?: (place: Place | null) => void;
}

const LocationInputCard: React.FC<Props> = ({
  pickup,
  destination,
  onInputFocus,
}) => {
  return (
    <View>
      {/* Pickup */}
      <View style={styles.card1}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '30' }]}>
              <Ionicons name={PICKUP_ICON} size={14} color={theme.colors.primary} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => onInputFocus("pickup")}
          >
            <Text style={styles.inputText}>
              {pickup || "Pickup location"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Destination */}
      <View style={styles.card2}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '30' }]}>
              <Ionicons name={DEST_ICON} size={14} color={theme.colors.primary} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => onInputFocus("destination")}
          >
            <Text style={styles.inputText}>
              {destination || "Where are you going?"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = createStyles({
  card1: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.sm,
    borderTopRightRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: 1,
    ...theme.shadows.md,
  },
  card2: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: theme.borderRadius.sm,
    borderBottomRightRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm },
  iconContainer: { width: 20, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 20, height: 20, borderRadius: 18,
    borderWidth: 1, borderColor: theme.colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  inputContainer: { flex: 1, marginLeft: theme.spacing.sm },
  inputText: { fontSize: 15, color: theme.colors.text },
});

export default LocationInputCard;
