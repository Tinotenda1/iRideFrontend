// components/PhoneInput.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import { theme } from '../constants/theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  countryCode: string;
  onCountryChange: (code: string) => void;
  style?: ViewStyle;
}

const countries = [
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
];

export default function PhoneInput({
  value,
  onChangeText,
  countryCode,
  onCountryChange,
  style,
}: PhoneInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedCountry = countries.find(c => c.dialCode === countryCode) || countries[0];

  return (
    <View style={[styles.container, style]}>
      {/* Country Picker */}
      <TouchableOpacity
        style={styles.countryPicker}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flag}>{selectedCountry.flag}</Text>
        <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Phone Number Input */}
      <TextInput
        style={styles.input}
        placeholder="Enter phone number"
        placeholderTextColor={theme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={countries}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    onCountryChange(item.dialCode);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                  </View>
                  {selectedCountry.code === item.code && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 0,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRightColor: theme.colors.border,
  },
  flag: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  dialCode: {
    fontSize: 16,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '80%',
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  countryFlag: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  countryDialCode: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
