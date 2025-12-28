// components/map/LocationSearch.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { theme } from '../../constants/theme';
import { createStyles, typedTypography } from '../../utils/styles';

export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  destination: string;
  onDestinationChange: (text: string) => void;
  onPlaceSelect: (place: Place | null) => void;
  placeholder?: string;
  editable?: boolean;

  /** ✅ NEW: Auto-focus input when component mounts */
  autoFocus?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  destination,
  onDestinationChange,
  onPlaceSelect,
  placeholder = 'Search location',
  editable = true,
  autoFocus = false,        // ← NEW
}) => {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const inputRef = useRef<TextInput>(null);

  // ✅ NEW: Automatically focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const mockPlaces: Place[] = [
    { id: '1', name: 'Harare International Airport', address: 'Airport Road, Harare', latitude: -17.931, longitude: 31.092 },
    { id: '2', name: 'Eastgate Shopping Centre', address: 'Robert Mugabe Road, Harare', latitude: -17.827, longitude: 31.052 },
    { id: '3', name: 'National Sports Stadium', address: 'Nelson Mandela Ave, Harare', latitude: -17.841, longitude: 31.017 },
  ];

  const parseCoordinates = (text: string): Place | null => {
    const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match = text.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          id: `coord-${Date.now()}`,
          name: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          address: 'Custom location',
          latitude: lat,
          longitude: lng,
        };
      }
    }
    return null;
  };

  const handleTextChange = (text: string) => {
    onDestinationChange(text);

    const coordPlace = parseCoordinates(text);
    if (coordPlace) {
      setSuggestions([coordPlace]);
      return;
    }

    if (text.length > 1) {
      const filtered = mockPlaces.filter(
        (place) =>
          place.name.toLowerCase().includes(text.toLowerCase()) ||
          place.address.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handlePlaceSelect = (place: Place) => {
    onDestinationChange(place.name);
    onPlaceSelect(place);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    onDestinationChange('');
    setSuggestions([]);
    onPlaceSelect(null);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={styles.leftIcon}
        />

        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          value={destination}
          onChangeText={handleTextChange}
          placeholderTextColor={theme.colors.textSecondary}
          editable={editable}
          autoFocus={autoFocus}      // ← NEW
        />

        {destination && editable && (
          <TouchableOpacity onPress={clearSearch} style={styles.rightIcon}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {editable && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handlePlaceSelect(item)}
              >
                <Ionicons
                  name={item.id.startsWith('coord-') ? 'pin' : 'location'}
                  size={20}
                  color={theme.colors.primary}
                />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionAddress}>{item.address}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = createStyles({
  wrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typedTypography.body,
    color: theme.colors.text,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.lg,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '30',
  },
  suggestionText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  suggestionName: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  suggestionAddress: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});

export default LocationSearch;
