// app/driver/components/trays/DriverSettingsTray.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
    BackHandler,
    Dimensions,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { IRButton } from '../../../../components/IRButton';
import { theme } from '../../../../constants/theme';

const { height: windowHeight } = Dimensions.get('window');
const OPEN_HEIGHT = windowHeight * 0.9; // same height as InputTray

const AdditionalInfoTray = forwardRef<any, { onClose?: () => void }>(
  ({ onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    // Back button closes tray
    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleClose();
          return true;
        }
      );
      return () => backHandler.remove();
    }, [isOpen]);

    // expose open/close for parent
    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => handleClose(),
    }));

    const handleClose = () => {
      setIsOpen(false);
      onClose?.();
    };

    const handleSave = () => {
    // call updateDriverSettings or similar function here
      handleClose();
    };

    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Tray */}
        <View style={styles.container}>
          <Text style={styles.label}>Additional Information</Text>

          <TextInput
            style={styles.textArea}
            multiline
            autoFocus
            placeholder="Enter any extra details for the driver..."
            placeholderTextColor={theme.colors.textSecondary}
          />

          <IRButton
            title="Save"
            onPress={handleSave}
            variant="primary"
            size="md"
            fullWidth
            style={{ marginTop: theme.spacing.lg }}
          />
        </View>
      </>
    );
  }
);

AdditionalInfoTray.displayName = "AdditionalInfoTray";
export default AdditionalInfoTray;

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    zIndex: 999,
  },
  label: { fontSize: 16, fontWeight: "600", marginBottom: theme.spacing.md, color: theme.colors.text },
  textArea: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, height: 200, textAlignVertical: "top", fontSize: 16, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
});
