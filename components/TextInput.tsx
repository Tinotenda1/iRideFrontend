//components/TextInput.tsx

import React from 'react';
import { TextInput as RNTextInput, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import { createStyles, typedTypography } from '../utils/styles';

interface TextInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  secureTextEntry?: boolean;
  editable?: boolean;
}

export default function TextInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  autoFocus = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  secureTextEntry = false,
  editable = true,
}: TextInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        autoCorrect={false}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = createStyles({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...typedTypography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  input: {
    ...typedTypography.body,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    minHeight: 50,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    ...typedTypography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});

