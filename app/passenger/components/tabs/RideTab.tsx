// app/passenger/components/tabs/RideTab.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRideBooking } from '../../../../app/context/RideBookingContext';
import { IRButton } from '../../../../components/IRButton';
import { theme } from '../../../../constants/theme';
import { createStyles } from '../../../../utils/styles';
import { OfferFareControl } from '../PassengerOfferFareControl';
import RideTypeCard from '../RideTypeCard';

interface TabProps {
  id: string;
  onOpenAdditionalInfo: () => void;
  onSwitchToSearching: () => void; // Added to interface
}

const RideTab: React.FC<TabProps> = ({ id, onOpenAdditionalInfo, onSwitchToSearching }) => {
  const insets = useSafeAreaInsets(); 
  const { rideData, updateRideData, submitRideBooking } = useRideBooking();
  const [isBooking, setIsBooking] = useState(false); 
  const [, setPickupText] = useState('Here');
  const [, setLoadingCurrentLocation] = useState(false);
  const [isReady, setIsReady] = useState(false); // Added to track when the tab is ready
  const selectedVehiclePrice = rideData.vehiclePrices?.[rideData.vehicleType] || 0;
  const isSelectionComplete = !!rideData.vehicleType && !!rideData.paymentMethod;

 // 1. DEFAULT VEHICLE (Run once)
  useEffect(() => {
    if (!rideData.vehicleType) {
      updateRideData({ vehicleType: '4seater' });
    }
  }, []);

  // 2. SYNC OFFER ON VEHICLE CHANGE
  // Only update the offer if the VEHICLE TYPE changes or the PRICES just loaded (went from 0 to X)
  useEffect(() => {
    const price = rideData.vehiclePrices?.[rideData.vehicleType || '4seater'];
    
    // Safety check: only update if we have a real price
    if (price && price > 0) {
       // We update the offer to the standard price in two cases:
       // A. The offer is currently 0 or null (first load)
       // B. The user just switched vehicle types (we don't want the 4-seater price persisting on a 7-seater)
       
       // Note: We are deliberately NOT checking "if (offer !== price)" here to avoid the loop.
       // Instead, we rely on the dependency array.
       updateRideData({ offer: price });
    }
  }, [rideData.vehicleType, rideData.vehiclePrices?.[rideData.vehicleType || '4seater']]); 
  // ^^^ Dependency trick: This only re-runs if the specific price for THIS vehicle changes,
  // or if the vehicle ID changes. It won't run if you just update the 'offer' elsewhere.
  // Added rideData.vehiclePrices as a specific dependency
  
 // READY CHECK
  useEffect(() => {
    // 500ms is usually enough for the tray transition to finish
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500); 

    return () => clearTimeout(timer);
  }, []);

  const rideTypes = [
    { 
      id: '4seater', 
      icon: require('../../../../assets/cars/4seat.png'), 
      title: '4 Seater', 
      seats: 4, 
      // Wait for transition before showing the actual price
      price: isReady ? (rideData.vehiclePrices?.['4seater'] || 0) : 0 
    },
    { 
      id: '7seater', 
      icon: require('../../../../assets/cars/7seat.png'), 
      title: '7 Seater', 
      seats: 7, 
      price: isReady ? (rideData.vehiclePrices?.['7seater'] || 0) : 0 
    },
    { 
      id: 'pickup', 
      icon: require('../../../../assets/cars/pickup.png'), 
      title: 'Pickup', 
      seats: 3, 
      price: isReady ? (rideData.vehiclePrices?.['pickup'] || 0) : 0 
    },
  ];

  const paymentMethods = [
    { id: 'ecocash', label: 'Ecocash' },
    { id: 'cash', label: 'Cash' },
  ];

  useEffect(() => {
    let mounted = true;
    const setInitialLocation = async () => {
      if (rideData.pickupLocation) return;
      setLoadingCurrentLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPickupText('Permission denied');
        setLoadingCurrentLocation(false);
        return;
      }
      try {
        const current = await Location.getCurrentPositionAsync({});
        if (!mounted) return;
        const place = {
          id: 'current',
          name: 'Here',
          address: 'Current Location',
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        updateRideData({ pickupLocation: place });
        setPickupText('Here');
      } catch (error) {
        console.error('❌ Error getting current location:', error);
        setPickupText('Unable to get location');
      } finally {
        setLoadingCurrentLocation(false);
      }
    };
    setInitialLocation();
    return () => { mounted = false; };
  }, [rideData.pickupLocation, updateRideData]);

  const handleFindRides = async () => {
    try {
      setIsBooking(true);
      await submitRideBooking(); 
      // Successfully extracted from props now:
      onSwitchToSearching(); 
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={[
        styles.container, 
        { paddingBottom: Math.max(insets.bottom, theme.spacing.md) } 
    ]}>
        <View style={styles.mainContent}>
          <View style={styles.carouselWrapper}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rideTypesCarousel}
            >
              {rideTypes.map((type) => (
                <View key={type.id} style={styles.rideTypeWrapper}>
                  <RideTypeCard
                    icon={type.icon}
                    title={type.title} 
                    price={type.price}
                    selected={rideData.vehicleType === type.id}
                    onPress={() => updateRideData({ vehicleType: type.id })}
                  />
                </View>
              ))}
            </ScrollView>

            <LinearGradient
              colors={[theme.colors.surface, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.leftFade}
              pointerEvents="none"
            />

            <LinearGradient
              colors={['transparent', theme.colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rightFade}
              pointerEvents="none"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Wallet size={16} color={theme.colors.textSecondary} />
            <Text style={styles.sectionHeaderText}>How I will pay for my Ride</Text>
          </View>

          <View style={styles.actionRow}>
            <View style={styles.paymentSection}>
              {paymentMethods.map((method) => {
                const isSelected = rideData.paymentMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.radioItem}
                    onPress={() => updateRideData({ paymentMethod: method.id })}
                    disabled={isBooking}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioLabel, isSelected && styles.textPrimary]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.infoButton} onPress={onOpenAdditionalInfo}>
              <Text style={[styles.infoText, rideData.additionalInfo && styles.textPrimary]}>
                Add Info
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

      <View>
        <View 
          style={[styles.offerContainer, !isSelectionComplete && { opacity: 0.5 }]}
          pointerEvents={isSelectionComplete ? 'auto' : 'none'}
        >
         {isReady && (
            <OfferFareControl
              minOffer={selectedVehiclePrice > 0 ? selectedVehiclePrice * 0.75 : 1}
              maxOffer={selectedVehiclePrice > 0 ? selectedVehiclePrice * 1.5 : 50}
              initialOffer={rideData.offer || selectedVehiclePrice}
              onOfferChange={(newOffer) => {
                // --- NEW OFFER TYPE LOGIC ---
                let offerType: 'poor' | 'fair' | 'good' = 'fair';
                
                if (newOffer < selectedVehiclePrice) {
                  offerType = 'poor';
                } else if (newOffer > selectedVehiclePrice) {
                  offerType = 'good';
                } else {
                  offerType = 'fair';
                }
                // Update both the value and the classification
                updateRideData({ 
                  offer: newOffer,
                  offerType: offerType 
                });
              }}
            />
          )}
        </View>
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <IRButton
            title={isBooking ? "" : `Find ${rideTypes.find(t => t.id === rideData.vehicleType)?.title || 'Ride'} Ride`}
            onPress={handleFindRides}
            variant="primary"
            size="md"
            fullWidth
            loading={isBooking}
            disabled={isBooking || !isSelectionComplete}
          />
        </View>
      </View>
    </View>
  );
};

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
  },
  carouselWrapper: {
    position: 'relative',
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 1,
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    zIndex: 1,
  },
  rideTypesCarousel: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rideTypeWrapper: {
    width: 140,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  paymentSection: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  textPrimary: {
    color: theme.colors.text,
  },
  offerContainer: {
    paddingBottom: theme.spacing.sm,
  },
});

export default RideTab;