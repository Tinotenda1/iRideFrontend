// components/SectionHeader.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { typedTypography } from '../utils/styles';

interface SectionHeaderProps {
  title: string;
  iconName: string;
  iconColor?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, iconName, iconColor }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: (iconColor || theme.colors.primary) + '30',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: theme.spacing.sm,
        }}
      >
        <Ionicons name={iconName as any} size={18} color={iconColor || theme.colors.primary} />
      </View>
      <Text style={{ ...typedTypography.body, fontWeight: '600', color: theme.colors.text }}>
        {title}
      </Text>
    </View>
  );
};

export default SectionHeader;
