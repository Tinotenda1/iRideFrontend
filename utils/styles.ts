import { StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

// Simple type-safe style creator that works with your existing theme
export const createStyles = <T extends StyleSheet.NamedStyles<T>>(styles: T): T => {
  return StyleSheet.create(styles);
};

// Helper to ensure fontWeight is properly typed
const safeFontWeight = (weight: string): 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' => {
  const validWeights = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  return (validWeights.includes(weight) ? weight : '400') as any;
};

// Create typed versions of your theme typography
export const typedTypography = {
  h1: {
    ...theme.typography.h1,
    fontWeight: safeFontWeight(theme.typography.h1.fontWeight),
  },
  h2: {
    ...theme.typography.h2,
    fontWeight: safeFontWeight(theme.typography.h2.fontWeight),
  },
  body: {
    ...theme.typography.body,
    fontWeight: safeFontWeight(theme.typography.body.fontWeight),
  },
  bodySmall: {
    ...theme.typography.bodySmall,
    fontWeight: safeFontWeight(theme.typography.bodySmall.fontWeight),
  },
  caption: {
    ...theme.typography.caption,
    fontWeight: safeFontWeight(theme.typography.caption.fontWeight),
  },
};