import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const tabs = [
  { id: 'home', icon: 'car-outline', iconActive: 'car', label: 'Home' },
  { id: 'revenue', icon: 'cash-outline', iconActive: 'cash', label: 'Revenue', isCurrency: true },
  { id: 'wallet', icon: 'wallet-outline', iconActive: 'wallet', label: 'iWallet' },
  { id: 'notifications', icon: 'notifications-outline', iconActive: 'notifications', label: 'Alerts' },
];


export default function DriverFooterNav({ active, onChange }: any) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.footer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            {tab.isCurrency ? (
              <Text
                style={[
                  styles.currency,
                  { color: active === tab.id ? theme.colors.primary : theme.colors.textSecondary }
                ]}
              >
                $
              </Text>
            ) : (
             <Ionicons
              name={active === tab.id ? (tab.iconActive as any) : (tab.icon as any)}
              size={24}
              color={active === tab.id ? theme.colors.primary : theme.colors.textSecondary}
            />

            )}

            <Text style={[styles.label, active === tab.id && { color: theme.colors.primary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#fff' },
  footer: {
    height: 65,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: { alignItems: 'center' },
  label: { fontSize: 12, marginTop: 2, color: theme.colors.textSecondary },
  currency: { 
    fontSize: 24, 
    fontWeight: '700' 
  },
});
