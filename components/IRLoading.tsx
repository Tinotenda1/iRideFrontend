import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';

interface IRLoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

export function IRLoading({ 
  size = 'large', 
  color = theme.colors.primary, 
  text,
  overlay = false 
}: IRLoadingProps) {
  const content = (
    <View style={[styles.container, overlay && styles.overlay]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );

  return content;
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 999,
  },
  text: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});