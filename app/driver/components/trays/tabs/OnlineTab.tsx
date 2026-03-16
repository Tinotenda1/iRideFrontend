// app/driver/components/trays/OnlineTab.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface OnlineTabProps {
  onGoOffline?: () => void;
  isOnline: boolean;
}

const OnlineTab: React.FC<OnlineTabProps> = ({ isOnline }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // ✅ Colors and text depending on online status
  const indicatorColor = isOnline ? "#00D26A" : "#EF4444"; // green online, red offline
  const statusText = isOnline ? "ONLINE" : "OFFLINE";
  const mainMessage = isOnline
    ? "Searching for riders nearby..."
    : "You are offline";
  const subMessage = isOnline
    ? "Stay in this area to increase your chances of getting a request."
    : "Check your internet connection to go online.";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={styles.dotContainer}>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: indicatorColor + "33",
                }, // semi-transparent pulse
              ]}
            />
            <View
              style={[styles.activeDot, { backgroundColor: indicatorColor }]}
            />
          </View>
          <Text style={[styles.statusText, { color: indicatorColor }]}>
            {statusText}
          </Text>
        </View>

        <Text style={styles.mainMessage}>{mainMessage}</Text>
        <Text style={styles.subMessage}>{subMessage}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerBrand}>DRIFT</Text>
        <Text style={styles.footerTagline}>Your Ride, Reimagined.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dotContainer: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00D26A", // Bolt Green
    position: "absolute",
  },
  pulseCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 210, 106, 0.2)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00D26A",
    letterSpacing: 1.5,
  },
  mainMessage: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
  },
  footerLine: {
    width: 30,
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerTagline: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 2,
    marginTop: 2,
    textTransform: "uppercase",
  },
});

export default OnlineTab;
