import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Settings, X } from "lucide-react-native"; // Added X icon
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Added for safe area
import { IRButton } from "../../../../components/IRButton";
import { theme } from "../../../../constants/theme";
import { api } from "../../../../utils/api";
import { ms, s, vs } from "../../../../utils/responsive";

const { height: windowHeight } = Dimensions.get("window");
const OPEN_HEIGHT = windowHeight * 0.7;

const DriverRideSettings = forwardRef<any, { onClose?: () => void }>(
  ({ onClose }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [radius, setRadius] = useState(5);
    const [originalRadius, setOriginalRadius] = useState(5);
    const [loading, setLoading] = useState(false);

    const hasChanges = radius !== originalRadius;

    useEffect(() => {
      if (!isOpen) return;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleClose();
          return true;
        },
      );
      return () => backHandler.remove();
    }, [isOpen]);

    useImperativeHandle(ref, () => ({
      open: () => setIsOpen(true),
      close: () => handleClose(),
    }));

    const handleClose = () => {
      if (loading) return;
      setIsOpen(false);
      onClose?.();
    };

    // Inside your DriverRideSettings component...

    const handleSave = async () => {
      if (!hasChanges || loading) return;

      setLoading(true);
      try {
        // Using your custom axios instance from utils/api
        const response = await api.post("/auth/saveSettings", {
          radius: radius,
        });

        // Based on your backend controller, we check for success
        if (response.data.success) {
          setOriginalRadius(radius);
          Alert.alert("Success", `Radius updated to ${radius}km`);
          // You can choose to close the tray or keep it open to show "Settings Applied"
        }
      } catch (error: any) {
        // Your api.ts already handles 401/409 logouts, so we just handle general errors here
        const errorMsg =
          error.response?.data?.message ||
          "Check your connection and try again.";
        Alert.alert("Update Failed", errorMsg);

        // Optional: Revert slider to last saved value on failure
        setRadius(originalRadius);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial data whenever the tray is opened
    useEffect(() => {
      const fetchCurrentRadius = async () => {
        try {
          // Create this endpoint in your backend to return the current alert_radius_km
          const response = await api.get("/auth/getSettings");
          if (response.data.success && response.data.radius) {
            setRadius(response.data.radius);
            setOriginalRadius(response.data.radius);
          }
        } catch (error) {
          console.error("Could not fetch driver radius settings");
        }
      };

      if (isOpen) {
        fetchCurrentRadius();
      }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.container}>
          {/* Added SafeAreaView to respect top/bottom notches */}
          <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Settings size={ms(22)} color={theme.colors.primary} />
                <Text style={styles.headerTitle}>Ride Settings</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Adjust your visibility for incoming drift requests.
              </Text>

              {/* Close Button at Top Right */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                disabled={loading}
              >
                <X size={ms(32)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={[theme.colors.surface, `${theme.colors.surface}00`]}
              style={styles.fadeZone}
              pointerEvents="none"
            />

            <View style={styles.content}>
              <View style={[styles.card, loading && { opacity: 0.6 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <MapPin size={ms(20)} color={theme.colors.primary} />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardLabel}>Request Radius</Text>
                    <Text style={styles.radiusValue}>{radius} km</Text>
                  </View>
                </View>

                <View style={styles.sliderContainer}>
                  <Slider
                    style={{ width: "100%", height: vs(40) }}
                    minimumValue={2}
                    maximumValue={10}
                    step={1}
                    value={radius}
                    onValueChange={setRadius}
                    disabled={loading}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                  <View style={styles.rangeLabels}>
                    <Text style={styles.rangeText}>2km</Text>
                    <Text style={styles.rangeText}>10km</Text>
                  </View>
                </View>

                <Text style={styles.infoText}>
                  The radius determines how far you will travel to pick up a
                  passenger.
                </Text>
              </View>

              <IRButton
                title={hasChanges ? "Save Changes" : "Settings Applied"}
                loading={loading}
                disabled={!hasChanges || loading}
                variant={hasChanges ? "primary" : "outline"}
                onPress={handleSave}
                fullWidth
                size="md"
                style={{ marginTop: vs(theme.spacing.lg) }}
              />
            </View>
          </SafeAreaView>
        </View>
      </>
    );
  },
);

DriverRideSettings.displayName = "DriverRideSettings";
export default DriverRideSettings;

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 9998,
    elevation: 9998,
  },
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: OPEN_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    zIndex: 9999,
    elevation: 9999,
  },
  header: {
    paddingHorizontal: s(theme.spacing.lg),
    paddingTop: vs(theme.spacing.lg),
    backgroundColor: theme.colors.surface,
    position: "relative", // Needed for absolute positioning of X
  },
  closeButton: {
    position: "absolute",
    backgroundColor: theme.colors.background,
    height: ms(40),
    width: ms(40),
    borderRadius: ms(50),
    right: s(theme.spacing.lg),
    top: vs(theme.spacing.lg),
    padding: ms(4),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    marginBottom: vs(8),
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: "800",
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: ms(14),
    color: theme.colors.textSecondary,
    lineHeight: vs(20),
    paddingRight: s(40), // Space so text doesn't hit the X button
  },
  fadeZone: {
    height: vs(30),
    width: "100%",
  },
  content: {
    paddingHorizontal: s(theme.spacing.lg),
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: ms(theme.spacing.md),
    borderWidth: 1,
    borderColor: theme.colors.border + "40",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(15),
  },
  iconCircle: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(10),
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(theme.spacing.md),
  },
  cardHeaderText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: ms(16),
    fontWeight: "700",
    color: theme.colors.text,
  },
  radiusValue: {
    fontSize: ms(13),
    color: theme.colors.primary,
    fontWeight: "800",
    marginTop: vs(2),
  },
  sliderContainer: {
    marginVertical: vs(10),
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(-5),
  },
  rangeText: {
    fontSize: ms(11),
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  infoText: {
    fontSize: ms(12),
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: vs(10),
    lineHeight: vs(16),
  },
});
