// app/driver/components/trays/OnlineTab.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface OnlineTabProps {
  onGoOffline?: () => void;
}

const OnlineTab: React.FC<OnlineTabProps> = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Elegant scale pulse animation
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Radar Indicator */}
        <View style={styles.statusRow}>
          <View style={styles.dotContainer}>
            <Animated.View
              style={[
                styles.pulseCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <View style={styles.activeDot} />
          </View>
          <Text style={styles.statusText}>ONLINE</Text>
        </View>

        <Text style={styles.mainMessage}>Searching for riders nearby...</Text>
        <Text style={styles.subMessage}>
          Stay in this area to increase your chances of getting a request.
        </Text>
      </View>

      {/* Signature Footer remains consistent across tabs */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerBrand}>iRide</Text>
        <Text style={styles.footerTagline}>YOUR RIDE, YOUR WAY</Text>
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
