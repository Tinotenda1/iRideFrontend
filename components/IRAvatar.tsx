// components/IRAvatar.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface IRAvatarProps {
  source?: { uri: string };
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'circle' | 'rounded';
  style?: ViewStyle;
}

export function IRAvatar({ 
  source, 
  name, 
  size = 'md', 
  variant = 'circle',
  style
}: IRAvatarProps) {

  const getSize = (): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 32;
      case 'md': return 48;
      case 'lg': return 64;
      case 'xl': return 80;
      default: return 48;
    }
  };

  const avatarSize = getSize();
  const borderRadius = variant === 'circle' ? avatarSize / 2 : theme.borderRadius.md;

  return (
    <View style={[
      styles.container,
      { width: avatarSize, height: avatarSize, borderRadius },
      style
    ]}>
      {source ? (
        // Actual image - same size as container
        <Image 
          source={source} 
          style={[styles.image, { borderRadius }]} 
        />
      ) : (
        // Placeholder icon - same size as container
        <View style={[styles.placeholder, { borderRadius }]}>
          <Ionicons 
            name="person" 
            size={avatarSize * 0.6} // Icon scales with avatar size
            color={theme.colors.textSecondary} 
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});