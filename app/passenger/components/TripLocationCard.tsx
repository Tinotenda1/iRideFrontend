// app/passenger/components/TripLocationCard.tsx
import { Navigation } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRideBooking } from '../../../app/context/RideBookingContext';
import { theme } from '../../../constants/theme';
import { createStyles } from '../../../utils/styles';

interface TripLocationCardProps {
  onPress?: () => void;
}

// Increased this value to ensure the "slide up" has enough distance to look like a slide
const HIDDEN_POSITION = -300; 

const TripLocationCard: React.FC<TripLocationCardProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();
  const { rideData } = useRideBooking();
  const RIDE_DELAY = Number(process.env.ride_Tab_And_Trip_Location_Card_Delay || 600);

  const translateY = useRef(new Animated.Value(HIDDEN_POSITION)).current;

  useEffect(() => {
    const hasDestination = !!rideData.destination;
    
    // Target is either top of screen (with inset) or hidden above the screen
    const targetY = hasDestination 
      ? insets.top + theme.spacing.sm 
      : HIDDEN_POSITION;

    // Opening: wait for the sync delay. Closing: slide up immediately.
    const delayTime = hasDestination ? RIDE_DELAY : 0;

    // Using the same spring physics for both directions creates symmetry
    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      tension: 60,   // "Snappiness"
      friction: 10,  // "Bounciness"
      delay: delayTime, 
    }).start();

  }, [rideData.destination, insets.top, RIDE_DELAY]);

  return (
    <Animated.View 
      style={[
        styles.animatedWrapper, 
        { transform: [{ translateY }] }
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onPress}
        style={styles.cardContent}
      >
        <View style={styles.lineDecorator}>
          <View style={styles.dotPickup} />
          <View style={styles.line} />
          <View style={styles.squareDestination} />
        </View>

        <View style={styles.locationsWrapper}>
          <View style={styles.locationRow}>
            <Text style={styles.locationText} numberOfLines={1}>
              {rideData.pickupLocation?.name || 'Current Location'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.locationRow}>
            <Text style={[styles.locationText, styles.destinationText]} numberOfLines={1}>
              {rideData.destination?.name || 'Select Destination'}
            </Text>
          </View>
        </View>
        
        <View style={styles.sideAction}>
           <Navigation size={20} color={theme.colors.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
const styles = createStyles({
  // The wrapper handles positioning and animation
  animatedWrapper: {
    position: 'absolute',
    top: 0, // Start at the very top edge
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 100,
     // High elevation to float over map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  // The card content handles the actual styling and touch interaction
  cardContent: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  lineDecorator: {
    alignItems: 'center',
    width: 20,
    height: 40,
    marginRight: theme.spacing.sm,
  },
  dotPickup: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  squareDestination: {
    width: 6,
    height: 6,
    backgroundColor: '#000',
  },
  locationsWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  locationRow: {
    height: 22,
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  destinationText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.3,
    marginVertical: 4,
  },
  sideAction: {
    paddingLeft: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default TripLocationCard;