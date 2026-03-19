// app/driver/components/DriverSideBar.tsx
import { ms, s, vs } from "@/utils/responsive"; // Added responsiveness utility
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IRButton } from "../../../components/IRButton";
import { LogoutButton } from "../../../components/Logout";
import { ProfileHeader } from "../../../components/ProfileHeader";
import { theme } from "../../../constants/theme";
import { ROUTES } from "../../../utils/routes";
import { createStyles, typedTypography } from "../../../utils/styles";

interface SidebarProps {
  userType: "passenger" | "driver";
  userName?: string;
  userRating?: number;
  userImage?: string;
}

const SIDEBAR_WIDTH = s(300);

export default React.forwardRef(function Sidebar(
  { userType, userName, userRating = 4.8, userImage }: SidebarProps,
  ref,
) {
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  React.useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  React.useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayOpacity]);

  const menuItems = [
    {
      label: "Home",
      screen: userType === "passenger" ? "/passenger" : "/driver",
      icon: "home" as const,
    },
    { label: "Ride History", screen: "/ride-history", icon: "time" as const },
    {
      label: "Payment Methods",
      screen: "/payment-methods",
      icon: "card" as const,
    },
    { label: "Promotions", screen: "/promotions", icon: "gift" as const },
    { label: "Support", screen: "/support", icon: "help-circle" as const },
    { label: "Settings", screen: "/settings", icon: "settings" as const },
  ];

  const safelyDisconnectDriver = () => {
    console.log("🔌 Sidebar: disconnecting driver socket");
  };

  return (
    <>
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateX: slideAnim }],
            shadowOpacity: isOpen ? 0.3 : 0,
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "bottom"]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.userInfo}>
                <ProfileHeader showRating size="lg" layout="horizontal" />
              </View>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={ms(24)}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.menuScroll}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => console.log(`Navigating to: ${item.screen}`)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={ms(20)}
                  color={theme.colors.textSecondary}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>{item.label}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={ms(16)}
                  color={theme.colors.border}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footerContent}>
            <IRButton
              title="Login as Driver"
              variant="primary"
              size="md"
              fullWidth
              onPress={() => {
                safelyDisconnectDriver();
                const dashboardRoute =
                  userType === "passenger"
                    ? ROUTES.DRIVER.HOME
                    : ROUTES.PASSENGER.HOME;
                router.replace({
                  pathname: dashboardRoute,
                  params: { switchingFromDriver: true },
                } as never);
              }}
            />
            <TouchableOpacity onPress={safelyDisconnectDriver}>
              <LogoutButton />
            </TouchableOpacity>

            <View style={styles.appInfo}>
              <Text style={styles.versionText}>Drift v1.0.0</Text>
              <Text style={styles.websiteText}>www.drift.app</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
});

const styles = createStyles({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 99998,
    elevation: 99998,
  },
  overlayTouchable: { flex: 1 },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: theme.colors.background,
    zIndex: 99999,
    elevation: 99999,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: ms(10),
    //borderTopRightRadius: ms(theme.borderRadius.xl),
    //borderBottomRightRadius: ms(theme.borderRadius.xl),
  },
  safeArea: { flex: 1 },
  header: {
    padding: s(theme.spacing.lg),
    backgroundColor: theme.colors.surface,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  closeButton: {
    padding: ms(theme.spacing.xs),
    marginLeft: s(theme.spacing.sm),
    borderRadius: ms(theme.borderRadius.sm),
  },
  menuScroll: { flex: 1, backgroundColor: theme.colors.surface },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(theme.spacing.lg),
    paddingVertical: vs(theme.spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: { marginRight: s(theme.spacing.md), width: s(24) },
  menuText: {
    ...typedTypography.body,
    fontSize: ms(14),
    color: theme.colors.text,
    flex: 1,
    fontWeight: "500",
  },
  footerContent: { padding: s(theme.spacing.lg) },
  appInfo: { alignItems: "center", marginTop: vs(theme.spacing.lg) },
  versionText: {
    ...typedTypography.caption,
    fontSize: ms(12),
    color: theme.colors.textSecondary,
    marginBottom: vs(theme.spacing.xs),
    fontWeight: "500",
  },
  websiteText: {
    ...typedTypography.caption,
    fontSize: ms(12),
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
});
