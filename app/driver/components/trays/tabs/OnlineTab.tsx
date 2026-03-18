// app/driver/components/trays/OnlineTab.tsx
import { ms, s, vs } from "@/utils/responsive"; // Imported your utility
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
  const indicatorColor = isOnline ? "#00D26A" : "#EF4444";
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
                },
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
    paddingHorizontal: s(28),
    paddingTop: vs(40),
    paddingBottom: vs(24),
  },
  content: {
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(20),
  },
  dotContainer: {
    width: s(20),
    height: s(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: s(10),
  },
  activeDot: {
    width: s(10),
    height: s(10),
    borderRadius: ms(10),
    position: "absolute",
  },
  pulseCircle: {
    width: s(20),
    height: s(20),
    borderRadius: ms(20),
  },
  statusText: {
    fontSize: ms(12),
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  mainMessage: {
    fontSize: ms(26),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: vs(8),
  },
  subMessage: {
    fontSize: ms(15),
    color: "#64748B",
    lineHeight: ms(22),
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
  },
  footerLine: {
    width: s(30),
    height: vs(1),
    backgroundColor: "#E2E8F0",
    marginBottom: vs(12),
  },
  footerBrand: {
    fontSize: ms(14),
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  footerTagline: {
    fontSize: ms(9),
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 2,
    marginTop: vs(2),
    textTransform: "uppercase",
  },
});

export default OnlineTab;
