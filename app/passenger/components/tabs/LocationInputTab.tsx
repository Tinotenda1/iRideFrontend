import { Clock, Navigation, Search, Star } from 'lucide-react-native';
import React from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useRideBooking } from '../../../../app/context/RideBookingContext';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import { Place } from '../map/LocationSearch';

interface LocationInputTabProps {
    onFocus?: (field: 'pickup' | 'destination') => void;
    onSuggestionSelect?: (place: Place) => void;
}

const SUGGESTIONS_PLACEHOLDER: Place[] = [
    { id: '1', name: 'Home', address: '123 Maple Avenue, Downtown', latitude: 0, longitude: 0 },
    { id: '2', name: 'Work', address: 'Tech Plaza, Silicon District', latitude: 0, longitude: 0 },
    { id: '3', name: 'Gym Center', address: '88 Fitness Way', latitude: 0, longitude: 0 },
];

const LocationInputTab: React.FC<LocationInputTabProps> = ({ 
    onFocus, 
    onSuggestionSelect 
}) => {
    const { rideData, updateRideData } = useRideBooking();

    // Reset destination on transition to this tab
    React.useEffect(() => {
      updateRideData({ destination: null });
    }, []);

    const handleSelect = (field: 'pickup' | 'destination', place: Place | null) => {
        updateRideData({ [field]: place });
        if (field === 'destination' && place) {
            onSuggestionSelect?.(place);
        }
    };

    return (
        <View style={styles.container}>
            {/* BOLT STYLE LOCATION INPUTS */}
            <View style={styles.inputSection}>
                <View style={styles.lineDecorator}>
                    <View style={styles.dotPickup} />
                    <View style={styles.line} />
                    <View style={styles.squareDestination} />
                </View>

                <View style={styles.fieldsWrapper}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Pickup location"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={rideData.pickupLocation?.name || ''}
                            onFocus={() => onFocus?.('pickup')}
                        />
                    </View>

                    <View style={styles.inputSeparator} />

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.textInput, { fontWeight: '600' }]}
                            placeholder="Where to?"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={rideData.destination?.name || ''}
                            onFocus={() => onFocus?.('destination')}
                            autoFocus={false}
                        />
                        <Search size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
                    </View>
                </View>
            </View>

            {/* SUGGESTIONS SECTION */}
            <View style={styles.suggestionsContainer}>
                <Text style={styles.sectionTitle}>Recent Destinations</Text>
                
                {SUGGESTIONS_PLACEHOLDER.map((item, index) => (
                    <TouchableOpacity 
                        key={item.id} 
                        style={[
                            styles.suggestionItem,
                            index === SUGGESTIONS_PLACEHOLDER.length - 1 && styles.noBorder
                        ]}
                        onPress={() => handleSelect('destination', item)}
                    >
                        <View style={styles.iconCircle}>
                            {index === 0 ? (
                                <Star size={18} color={theme.colors.textSecondary} />
                            ) : (
                                <Clock size={18} color={theme.colors.textSecondary} />
                            )}
                        </View>
                        
                        <View style={styles.textContainer}>
                            <Text style={styles.placeName}>{item.name}</Text>
                            <Text style={styles.placeAddress} numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                        
                        <Navigation size={16} color={theme.colors.border} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// ... styles remain unchanged

const styles = createStyles({
    container: { flex: 1, backgroundColor: theme.colors.surface },
    inputSection: { flexDirection: 'row', paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, backgroundColor: theme.colors.surface },
    lineDecorator: { alignItems: 'center', width: 20, marginVertical: 15, marginRight: theme.spacing.sm },
    dotPickup: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
    line: { flex: 1, width: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
    squareDestination: { width: 8, height: 8, backgroundColor: '#000' },
    fieldsWrapper: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 12, paddingHorizontal: theme.spacing.md },
    inputContainer: { height: 50, flexDirection: 'row', alignItems: 'center' },
    textInput: { flex: 1, fontSize: 15, color: theme.colors.text },
    inputSeparator: { height: 1, backgroundColor: theme.colors.border + '50' },
    searchIcon: { marginLeft: theme.spacing.xs },
    suggestionsContainer: { marginTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, textTransform: 'uppercase', letterSpacing: 1.2 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '30' },
    noBorder: { borderBottomWidth: 0 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
    textContainer: { flex: 1 },
    placeName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    placeAddress: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});

export default LocationInputTab;