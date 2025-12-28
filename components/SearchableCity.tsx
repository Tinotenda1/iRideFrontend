// components/SearchableCity.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, TextInput as RNTextInput, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { createStyles, typedTypography } from '../utils/styles';

// Common cities list
const CITIES = [
  'Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Epworth', 'Kwekwe',
  'Kadoma', 'Masvingo', 'Chinhoyi', 'Marondera', 'Norton', 'Chegutu', 'Bindura',
  'Zvishavane', 'Redcliffe', 'Rusape', 'Chiredzi', 'Beitbridge', 'Kariba',
  'Karoi', 'Victoria Falls', 'Hwange', 'Gwanda', 'Shurugwi', 'Mazowe',
  'Lupane', 'Plumtree', 'Murewa', 'Mutoko', 'Nyanga', 'Chimanimani',
];

interface SearchableCityProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectCity?: (city: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export default function SearchableCity({
  placeholder = 'Search for your city...',
  value,
  onChangeText,
  onSelectCity,
  error,
  autoFocus = false,
}: SearchableCityProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value.trim().length > 0) {
      const filtered = CITIES.filter(city =>
        city.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleBlur = () => {
    blurTimeout.current = setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSelectCity = (city: string) => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current); // cancel blur timeout
    }
    setShowSuggestions(false);          // hide suggestions immediately
    onChangeText(city);
    if (onSelectCity) {
      onSelectCity(city);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <RNTextInput
          style={[styles.input, error && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => value.trim().length > 0 && setShowSuggestions(false)}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setShowSuggestions(false);
              onChangeText('');
              
            }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {showSuggestions && filteredCities.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(item)}
              >
                <Ionicons name="location" size={18} color={theme.colors.primary} />
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
        </View>
      )}
    </View>
  );
}

const styles = createStyles({
  container: {
    marginBottom: theme.spacing.md,
    zIndex: 10,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    ...typedTypography.body,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingRight: 40,
    color: theme.colors.text,
    minHeight: 50,
    flex: 1,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  clearButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  errorText: {
    ...typedTypography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.xs,
    maxHeight: 200,
    ...theme.shadows.lg,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  suggestionText: {
    ...typedTypography.body,
    color: theme.colors.text,
    flex: 1,
  },
});
