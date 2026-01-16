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
  }, [offer, onOfferChange]);

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
    <>
      <Text style={styles.offerLabel}>Offer your fare</Text>

      <View style={styles.offerControl}>
        <TouchableOpacity
          style={[styles.adjustBtn, offer <= minOffer && styles.disabledBtn]}
          onPress={decreaseOffer}
          disabled={offer <= minOffer}
        >
          <Text style={styles.adjustText}>−</Text>
        </TouchableOpacity>

        <View style={styles.offerDisplay}>
          <Text style={styles.offerValue}>${offer.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.adjustBtn, offer >= maxOffer && styles.disabledBtn]}
          onPress={increaseOffer}
          disabled={offer >= maxOffer}
        >
          <Text style={styles.adjustText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rangeText}>
        Range: ${minOffer.toFixed(2)} – ${maxOffer.toFixed(2)}
      </Text>
    </>
  );
};

const styles = StyleSheet.create({
  offerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textAlign: 'center',
  },
  offerControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  adjustBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#cbd5e1',
  },
  adjustText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  offerDisplay: {
    minWidth: 90,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  offerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  rangeText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
