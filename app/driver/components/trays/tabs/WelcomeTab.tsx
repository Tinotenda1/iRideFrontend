// app/driver/components/trays/tabs/WelcomeTab.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getUserInfo, UserInfo } from "../../../../../utils/storage";

interface WelcomeTabProps {
  onGoOnline?: () => void;
}

const WelcomeTab: React.FC<WelcomeTabProps> = ({ onGoOnline }) => {
  const [driverName, setDriverName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const info: UserInfo | null = await getUserInfo();
        setDriverName(info?.firstName || "Partner");
      } catch (error) {
        setDriverName("Partner");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#00D26A"
            style={{ alignSelf: "flex-start" }}
          />
        ) : (
          <>
            <Text style={styles.greeting}>Hello, {driverName}</Text>
            <Text style={styles.subGreeting}>
              You are currently offline. Go online to start receiving ride
              requests and earning with iRide.
            </Text>
          </>
        )}
      </View>

      {/* Footer Branding */}
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
    paddingTop: vs(48),
    paddingBottom: vs(24),
  },
  content: {
    flex: 1,
  },
  greeting: {
    fontSize: ms(32),
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
    marginBottom: vs(12),
  },
  subGreeting: {
    fontSize: ms(16),
    color: "#64748B",
    lineHeight: ms(24),
    fontWeight: "500",
    maxWidth: "90%",
  },
  footer: {
    alignItems: "center",
    marginTop: vs(20),
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

export default WelcomeTab;
