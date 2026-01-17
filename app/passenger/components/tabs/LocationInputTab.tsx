// components/tabs/LocationInputTab.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import LocationInputCard from '../map/LocationInputCard';

interface LocationInputTabProps {
  pickup: string;
  destination: string;
  onInputFocus: (field: 'pickup' | 'destination') => void;
}

// Placeholder Suggestions (Logic to fetch from backend later)
const SUGGESTIONS = [
  { id: '1', name: 'Work', address: '123 Business Ave' },
  { id: '2', name: 'Home', address: '456 Residential St' },
  { id: '3', name: 'Gym', address: '789 Fitness Way' },
];

const LocationInputTab: React.FC<LocationInputTabProps> = ({ pickup, destination, onInputFocus }) => {
  return (
    <View style={styles.container}>
      <LocationInputCard 
        pickup={pickup} 
        destination={destination} 
        onInputFocus={onInputFocus} 
      />

      <View style={styles.suggestionsHeader}>
        <Text style={styles.headerText}>Suggestions</Text>
      </View>

      {SUGGESTIONS.map((item) => (
        <TouchableOpacity key={item.id} style={styles.suggestionItem}>
          <View style={styles.suggestionIcon}>
            <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
          </View>
          <View>
            <Text style={styles.suggestionName}>{item.name}</Text>
            <Text style={styles.suggestionAddress}>{item.address}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = createStyles({
  container: { flex: 1 },
  suggestionsHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  headerText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionIcon: { marginRight: theme.spacing.md },
  suggestionName: { fontSize: 16, color: theme.colors.text, fontWeight: '600' },
  suggestionAddress: { fontSize: 13, color: theme.colors.textSecondary },
});

export default LocationInputTab;