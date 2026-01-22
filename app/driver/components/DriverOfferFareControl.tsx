import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface OfferFareControlProps {
  minOffer: number;
  maxOffer: number;
  initialOffer: number;
  onOfferChange: (offer: number) => void;
}

const STEP = 0.5;

export const OfferFareControl = ({
  minOffer,
  maxOffer,
  initialOffer,
  onOfferChange,
}: OfferFareControlProps) => {
  const [offer, setOffer] = useState(initialOffer);

  useEffect(() => {
    setOffer(initialOffer);
  }, [initialOffer]);

  useEffect(() => {
    onOfferChange(offer);
  }, [offer]);

  const decreaseOffer = () => {
    setOffer(prev =>
      Math.max(minOffer, Number((prev - STEP).toFixed(2)))
    );
  };

  const increaseOffer = () => {
    setOffer(prev =>
      Math.min(maxOffer, Number((prev + STEP).toFixed(2)))
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.offerLabel}>Offer your fare</Text>

      <View style={styles.boltPill}>
        <TouchableOpacity
          style={[styles.adjustBtn, offer <= minOffer && styles.disabledOpacity]}
          onPress={decreaseOffer}
          disabled={offer <= minOffer}
          activeOpacity={0.6}
        >
          <Text style={styles.adjustText}>−</Text>
        </TouchableOpacity>

        <View style={styles.offerDisplay}>
          <Text style={styles.currencySymbol}>$</Text>
          <Text style={styles.offerValue}>{offer.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.adjustBtn, offer >= maxOffer && styles.disabledOpacity]}
          onPress={increaseOffer}
          disabled={offer >= maxOffer}
          activeOpacity={0.6}
        >
          <Text style={styles.adjustText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rangeText}>
        Range: ${minOffer.toFixed(2)} – ${maxOffer.toFixed(2)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  offerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8', // Slate 400
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  boltPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // Very light slate (Bolt style background)
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: '80%',
    justifyContent: 'space-between',
  },
  adjustBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#0f172a', // Dark slate
  },
  disabledOpacity: {
    opacity: 0.2,
  },
  offerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 2,
    marginTop: 2, // Fine-tuning alignment
  },
  offerValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    fontVariant: ['tabular-nums'], // Prevents jumping when numbers change
  },
  rangeText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    opacity: 0.8,
  },
});