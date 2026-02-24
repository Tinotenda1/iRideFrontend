import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../../../constants/theme";
import { createStyles, typedTypography } from "../../../../utils/styles";

/**
 * API Key pulled from Expo Config
 */
const GOOGLE_MAPS_APIKEY = Constants.expoConfig?.extra?.googleMapsApiKey;

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
  autoFocus?: boolean;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  destination,
  onDestinationChange,
  onPlaceSelect,
  placeholder = "Search location",
  editable = true,
  autoFocus = false,
}) => {
  // --- UI & Search State ---
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // --- Billing & Optimization State ---
  const [sessionToken, setSessionToken] = useState<string>("");
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Generates a unique UUID for Google Places session billing.
   * This groups multiple keystrokes into one "session" to save costs.
   */
  const refreshSessionToken = () => {
    const newToken = Crypto.randomUUID();
    setSessionToken(newToken);
  };

  // Initial setup: focus input and start a billing session
  useEffect(() => {
    refreshSessionToken();
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  /**
   * Calls Google Places Autocomplete API.
   * Restricted to Zimbabwe (ZW) for operational accuracy.
   */
  const fetchAutocomplete = async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      const baseUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json`;
      const queryParams = new URLSearchParams({
        input: text,
        key: GOOGLE_MAPS_APIKEY || "",
        types: "geocode|establishment",
        sessiontoken: sessionToken,
        components: "country:zw", // Geographic restriction
      });

      const response = await fetch(`${baseUrl}?${queryParams.toString()}`);
      const json = await response.json();
      setSuggestions(json.predictions || []);
    } catch (error) {
      console.error("Autocomplete Error:", error);
    } finally {
      setSearching(false);
    }
  };

  /**
   * Handles text input with debouncing.
   * Wait 500ms after typing stops before calling the API.
   */
  const handleTextChange = (text: string) => {
    onDestinationChange(text);
    if (!sessionToken) refreshSessionToken();

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchAutocomplete(text);
    }, 500);
  };

  /**
   * Fetches the final Lat/Lng coordinates for a selected result.
   */
  const handlePlaceSelect = async (prediction: any) => {
    onDestinationChange(prediction.structured_formatting.main_text);
    setSuggestions([]);
    setSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_APIKEY}&fields=geometry,formatted_address,name&sessiontoken=${sessionToken}`,
      );
      const json = await response.json();
      const { lat, lng } = json.result.geometry.location;

      onPlaceSelect({
        id: prediction.place_id,
        name: json.result.name,
        address: json.result.formatted_address,
        latitude: lat,
        longitude: lng,
      });

      // End current billing session and reset for next search
      setSessionToken("");
      refreshSessionToken();
    } catch (error) {
      console.error("Details Error:", error);
    } finally {
      setSearching(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    onDestinationChange("");
    setSuggestions([]);
    onPlaceSelect(null);
    refreshSessionToken();
  };

  return (
    <View style={styles.wrapper}>
      {/* Search Input Bar */}
      <View style={styles.container}>
        {searching ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.leftIcon}
          />
        ) : (
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          value={destination}
          onChangeText={handleTextChange}
          placeholderTextColor={theme.colors.textSecondary}
          editable={editable}
        />

        {destination && editable && (
          <TouchableOpacity onPress={clearSearch} style={styles.rightIcon}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestion List Overlay */}
      {editable && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handlePlaceSelect(item)}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="location-sharp"
                    size={16}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* No Results Feedback */}
      {editable &&
        suggestions.length === 0 &&
        destination.length >= 3 &&
        !searching && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No locations found in Zimbabwe
            </Text>
          </View>
        )}
    </View>
  );
};

// --- Styles ---
const styles = createStyles({
  wrapper: {
    zIndex: 1000,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 54,
    ...theme.shadows.md,
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
  },
  suggestionsContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    maxHeight: 250,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionText: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  suggestionName: {
    ...typedTypography.body,
    fontWeight: "600",
  },
  suggestionAddress: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
  },
  noResults: {
    marginTop: 5,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    ...theme.shadows.sm,
  },
  noResultsText: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
  },
});

export default LocationSearch;
