// app/driver/components/trays/tabs/WelcomeTab.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getUserInfo, UserInfo } from "../../../../../utils/storage";

interface WelcomeTabProps {
  onGoOnline?: () => void; // Added this to fix the TS error
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
    paddingTop: 48,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  subGreeting: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    fontWeight: "500",
    maxWidth: "90%",
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
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

export default WelcomeTab;
