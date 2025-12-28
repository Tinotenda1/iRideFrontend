import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, TextInput, View } from "react-native";
import { theme } from "../constants/theme";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  autoFocus?: boolean;
  resetKey?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  autoFocus = true,
  resetKey,
}) => {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<React.RefObject<TextInput | null>[]>([]);

  // Initialize refs
  if (inputsRef.current.length !== length) {
    inputsRef.current = Array(length)
      .fill(0)
      .map(() => React.createRef<TextInput>());
  }

  useEffect(() => {
    setValues(Array(length).fill(""));
    if (autoFocus && inputsRef.current[0]?.current) {
      setTimeout(() => {
        inputsRef.current[0]?.current?.focus();
      }, 100);
    }
  }, [resetKey, length, autoFocus]);

  const handleChange = (text: string, index: number) => {
    const newValues = [...values];
    newValues[index] = text.replace(/[^0-9]/g, "");
    setValues(newValues);

    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.current?.focus();
    }

    if (newValues.every((v) => v !== "")) {
      onComplete(newValues.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.current?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TextInput
            key={index}
            ref={inputsRef.current[index]}
            style={styles.input}
            value={values[index]}
            onChangeText={(text) => handleChange(text, index)}
            keyboardType="number-pad"
            maxLength={1}
            onKeyPress={(e) => handleKeyPress(e, index)}
            textAlign="center"
            autoFocus={index === 0 && autoFocus}
            placeholder="-"
            placeholderTextColor={theme.colors.textSecondary}
            selectionColor={theme.colors.primary}
          />
        ))}
    </View>
  );
};

export default OTPInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: theme.spacing.lg,
  },
  input: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontSize: 24,
    borderBottomWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
});
