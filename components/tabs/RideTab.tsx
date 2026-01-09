// components/tabs/RideTab.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRideBooking } from '../../app/context/RideBookingContext';
import { theme } from '../../constants/theme';
import { createStyles, typedTypography } from '../../utils/styles';
import { IRButton } from '../IRButton';
import { Place } from '../map/PickupInput';
import RideTypeCard from '../RideTypeCard';

interface TabProps {
  id: string;
  onOpenAdditionalInfo: () => void; // ✅ Added prop
}

const RideTab: React.FC<TabProps> = ({ id, onOpenAdditionalInfo }) => {
  const { rideData, updateRideData, submitRideBooking } = useRideBooking();

  const [, setPickupText] = useState('Here');
  const [, setLoadingCurrentLocation] = useState(false);

const rideTypes = [
  {
    id: '4seater',
    icon: require('../../assets/cars/4seat.png'),
    title: '4 Seater',
    seats: 4,
    price: 3.50,
  },
  { 
    id: '7seater',
    icon: require('../../assets/cars/7seat.png'),
    title: '7 Seater',
    seats: 7,
    price: 5.50,
  },
  {
    id: 'pickup',
    icon: require('../../assets/cars/pickup.png'),
    title: 'Pickup',
    seats: 3,
    price: 6,
  },
];


  const paymentMethods = [
    { id: 'ecocash', label: 'Ecocash' },
    { id: 'cash', label: 'Cash' },
  ];

  // ⭐ Auto-set current location ONCE
  useEffect(() => {
    let mounted = true;

    const setInitialLocation = async () => {
      // ✅ Guard: do nothing if pickup already set
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

        const place: Place = {
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

    return () => {
      mounted = false;
    };
  }, []); // ✅ EMPTY DEP ARRAY


  const handleFindRides = () => {
    submitRideBooking();
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {/* ⭐ RIDE TYPES CAROUSEL */}
<ScrollView 
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.rideTypesCarousel}
  snapToAlignment="start"
  decelerationRate="fast"
>
  {rideTypes.map((type) => (
    <View key={type.id} style={styles.rideTypeWrapper}>
      <RideTypeCard
        icon={type.icon}
        seats={type.seats}
        price={type.price}
        selected={rideData.vehicleType === type.id}
        onPress={() => updateRideData({ vehicleType: type.id })}
      />
    </View>
  ))}
</ScrollView>

           {/* PAYMENT METHOD + INFO BUTTON */}
<View style={[styles.paymentRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
  {/* RADIO BUTTONS */}
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
      flex: 1,
    }}
  >
    {paymentMethods.map((method) => {
      const isSelected = rideData.paymentMethod === method.id;
      return (
        <TouchableOpacity
          key={method.id}
          style={styles.radioItem}
          onPress={() => updateRideData({ paymentMethod: method.id })}
        >
          <View style={styles.radioOuter}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
          <Text
            style={[
              styles.radioLabel,
              { color: isSelected ? theme.colors.text : theme.colors.textSecondary },
            ]}
          >
            {method.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>

  {/* INFO BUTTON aligned right */}
  <TouchableOpacity
    style={styles.infoButton}
    onPress={onOpenAdditionalInfo}
  >
    <Ionicons
      name="information-circle-outline"
      size={20}
      color={rideData.additionalInfo ? theme.colors.text : theme.colors.textSecondary}
      style={{ marginLeft: 6 }}
    />
    <Text
      style={[
        styles.radioLabel,
        { color: rideData.additionalInfo ? theme.colors.text : theme.colors.textSecondary },
      ]}
    >
      Add Info
    </Text>
    <Ionicons
      name="chevron-forward"
      size={20}
      color={rideData.additionalInfo ? theme.colors.text : theme.colors.textSecondary}
      style={{ marginLeft: 2 }}
    />
  </TouchableOpacity>
</View>


      {/* ⭐ FIND RIDES BUTTON */}
      <IRButton
        title="Find Ride"
        onPress={handleFindRides}
        variant="primary"
        size="md"
        fullWidth
        style={{ marginTop: theme.spacing.sm }}
      />
    </ScrollView>
  );
};

const styles = createStyles({
  scrollContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.sm,
  },
  rideTypes: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  rideTypeButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rideTypeButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  rideTypeTitle: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  rideTypeTitleSelected: {
    color: theme.colors.primary,
  },
  rideTypeSeats: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  radioLabel: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  findRidesButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  findRidesButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  rideTypesCarousel: {
  paddingHorizontal: theme.spacing.md,
  paddingBottom: theme.spacing.sm,
  gap: theme.spacing.md,
},

rideTypeWrapper: {
  width: 140, // fixed width per card (adjust as needed)
},

});

export default RideTab;
