import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity
} from 'react-native';
import { theme } from '../constants/theme';
import { createStyles, typedTypography } from '../utils/styles';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' ? theme.colors.primary : theme.colors.surface} 
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text style={[
            styles.text,
            styles[`${variant}Text`],
            styles[`${size}Text`]
          ]}>
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = createStyles({
  // Base button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },

  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },

  // Sizes
  small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 40,
  },
  medium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 55,
  },
  large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 60,
  },

  // Text styles for variants
  primaryText: {
    color: theme.colors.surface,
  },
  secondaryText: {
    color: theme.colors.surface,
  },
  outlineText: {
    color: theme.colors.primary,
  },

  // Text styles for sizes
  smallText: {
    ...typedTypography.bodySmall,
    fontWeight: '600' as const,
  },
  mediumText: {
    ...typedTypography.body,
    fontWeight: '600' as const,
  },
  largeText: {
    ...typedTypography.body,
    fontSize: 18,
    fontWeight: '600' as const,
  },

  // Other modifiers
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },

  // Base text style
  text: {
    textAlign: 'center' as const,
  },
});

export default Button;