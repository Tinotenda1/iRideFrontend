import { theme } from "@/constants/theme";
import { ms, s, vs } from "@/utils/responsive"; // Using your utilities
import { forwardRef, useImperativeHandle, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { IRButton } from "./IRButton";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = windowHeight * 0.92; // Slightly adjusted for better safe area handling

// Validations Regex (remain unchanged)
const REGEX_ID = /^\d{2}-\d{6,9}[A-Z]\d{2}$/;
const REGEX_PLATE = /^[A-Z]{3}-\d{4}$/;
const REGEX_YEAR = /^\d{4}$/;

// Suggestions Data (remain unchanged)
const POPULAR_MAKES = [
  "Toyota",
  "Honda",
  "Nissan",
  "Mazda",
  "Mercedes-Benz",
  "BMW",
  "Volkswagen",
  "Hyundai",
];
const POPULAR_COLORS = [
  "White",
  "Silver",
  "Black",
  "Grey",
  "Blue",
  "Red",
  "White Pearl",
  "Gold",
];

interface InputTrayProps {
  activeField:
    | "fullName"
    | "city"
    | "idNumber"
    | "plateNumber"
    | "year"
    | "makeModel"
    | "color";
  initialValue?: string;
  onClose?: () => void;
  onValueChange?: (value: string) => void;
}

const InputTray = forwardRef<any, InputTrayProps>(
  ({ activeField, initialValue, onClose, onValueChange }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [textValue, setTextValue] = useState("");
    const [make, setMake] = useState("");
    const [model, setModel] = useState("");

    useImperativeHandle(ref, () => ({
      open: () => {
        if (activeField === "makeModel") {
          const parts = (initialValue || "").split(" ");
          setMake(parts[0] || "");
          setModel(parts.slice(1).join(" ") || "");
        } else {
          setTextValue(initialValue || "");
        }
        setIsOpen(true);
      },
      close: () => handleClose(),
    }));

    const getIsDisabled = () => {
      if (activeField === "idNumber")
        return !REGEX_ID.test(textValue.toUpperCase());
      if (activeField === "plateNumber")
        return !REGEX_PLATE.test(textValue.toUpperCase());
      if (activeField === "year") return !REGEX_YEAR.test(textValue);
      if (activeField === "makeModel")
        return make.trim() === "" || model.trim() === "";
      return textValue.trim() === "";
    };

    const handleClose = () => {
      const finalValue =
        activeField === "makeModel" ? `${make} ${model}`.trim() : textValue;
      onValueChange?.(finalValue);
      setIsOpen(false);
      onClose?.();
    };

    const renderSuggestions = (
      currentValue: string,
      list: string[],
      onSelect: (val: string) => void,
    ) => {
      if (!currentValue) return null;
      const filtered = list.filter(
        (item) =>
          item.toLowerCase().includes(currentValue.toLowerCase()) &&
          item !== currentValue,
      );
      if (filtered.length === 0) return null;

      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionScroll}
        >
          {filtered.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.suggestionChip}
              onPress={() => onSelect(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    };

    if (!isOpen) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <Text style={styles.label}>
              {activeField === "idNumber"
                ? "National ID Number"
                : activeField === "plateNumber"
                  ? "License Plate"
                  : activeField === "makeModel"
                    ? "Vehicle Details"
                    : activeField === "color"
                      ? "Vehicle Color"
                      : activeField === "year"
                        ? "Vehicle Year"
                        : activeField}
            </Text>
            {(activeField === "idNumber" ||
              activeField === "plateNumber" ||
              activeField === "year") && (
              <Text style={styles.hint}>
                Format:{" "}
                {activeField === "idNumber"
                  ? "00-000000X00"
                  : activeField === "plateNumber"
                    ? "ABC-1234"
                    : "YYYY (e.g. 2026)"}
              </Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            {activeField === "makeModel" ? (
              <>
                <TextInput
                  style={styles.textInput}
                  placeholder="Make (e.g. Toyota)"
                  value={make}
                  onChangeText={setMake}
                  autoFocus
                />
                {renderSuggestions(make, POPULAR_MAKES, setMake)}
                <TextInput
                  style={[styles.textInput, { marginTop: vs(15) }]}
                  placeholder="Model (e.g. Corolla)"
                  value={model}
                  onChangeText={setModel}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.textInput}
                  placeholder={`Enter ${activeField}`}
                  value={textValue}
                  onChangeText={(val) => {
                    // Prevent typing more than 4 characters if it's the year
                    if (activeField === "year" && val.length > 4) return;

                    setTextValue(
                      activeField === "idNumber" ||
                        activeField === "plateNumber"
                        ? val.toUpperCase()
                        : val,
                    );
                  }}
                  autoFocus
                  keyboardType={
                    activeField === "year" ? "number-pad" : "default"
                  } // Use numeric pad for year
                  maxLength={activeField === "year" ? 4 : undefined} // UI restriction
                  autoCapitalize={
                    activeField === "idNumber" || activeField === "plateNumber"
                      ? "characters"
                      : "words"
                  }
                />
                {activeField === "color" &&
                  renderSuggestions(textValue, POPULAR_COLORS, setTextValue)}
              </>
            )}

            <View style={styles.buttonWrapper}>
              <IRButton
                title="Confirm"
                variant="primary"
                onPress={handleClose}
                disabled={getIsDisabled()}
                fullWidth
                style={{ opacity: getIsDisabled() ? 0.5 : 1 }}
              />
            </View>
          </View>
        </View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.4)",
    zIndex: 998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    paddingHorizontal: s(20),
    paddingTop: vs(12),
    zIndex: 999,
  },
  dragHandle: {
    width: s(38),
    height: vs(5),
    backgroundColor: theme.colors.background,
    borderRadius: ms(10),
    alignSelf: "center",
    marginBottom: vs(16),
  },
  header: { marginBottom: vs(20) },
  label: {
    fontSize: ms(22),
    fontWeight: "800",
    color: "#1e293b",
    textTransform: "capitalize",
  },
  hint: {
    fontSize: ms(13),
    color: "#64748b",
    marginTop: vs(4),
  },
  inputWrapper: { flex: 1 },
  textInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: ms(12),
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    fontSize: ms(16),
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
  },
  buttonWrapper: { marginTop: vs(30) },
  suggestionScroll: {
    flexDirection: "row",
    marginTop: vs(10),
    marginBottom: vs(5),
  },
  suggestionChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: s(15),
    paddingVertical: vs(8),
    borderRadius: ms(20),
    marginRight: s(10),
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  suggestionText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: ms(14),
  },
});

InputTray.displayName = "InputTray";
export default InputTray;
