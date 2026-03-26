import { ms, s, vs } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Components & Utils
import { IRButton } from "../../../components/IRButton";
import { LogoutButton } from "../../../components/Logout";
import { ProfileHeader } from "../../../components/ProfileHeader";
import TripStatusModal, {
  ModalType,
} from "../../../components/TripStatusModal";
import { theme } from "../../../constants/theme";
import { api } from "../../../utils/api";
import { ROUTES } from "../../../utils/routes";
import { getUserInfo, updateUserInfo } from "../../../utils/storage";
import { createStyles, typedTypography } from "../../../utils/styles";

interface SidebarProps {
  userType: "passenger" | "driver";
  userName?: string;
  userRating?: number;
  userImage?: string;
}

const SIDEBAR_WIDTH = s(300);

export default forwardRef(function Sidebar(
  { userType, userName, userRating = 4.8, userImage }: SidebarProps,
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  // Modal & Registration States
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("pending");
  const [modalContent, setModalContent] = useState({ title: "", message: "" });
  const [backendStatus, setBackendStatus] = useState("unregistered");
  const [rejectionMessage, setRejectionMessage] = useState("");

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  // ✅ 1. Check Backend Status when Sidebar Opens
  useEffect(() => {
    console.log("userType:", userType);
    // Inside your useEffect for checking status...
    const checkStatus = async () => {
      if (userType === "passenger" && isOpen) {
        try {
          const storedUser = await getUserInfo();
          // ✅ Sanitize the phone number: remove all non-numeric characters
          const rawPhone = storedUser?.phone;
          const sanitizedPhone = rawPhone ? rawPhone.replace(/\D/g, "") : null;

          if (!sanitizedPhone) return;

          const response = await api.get(`/user/checkUserType`, {
            params: { phone: sanitizedPhone }, // Use the sanitized version
          });

          const { user_type, verification_status, message } = response.data;

          setBackendStatus(verification_status);
          setRejectionMessage(message || "");

          if (user_type === "driver" || verification_status === "approved") {
            setIsDriver(true);
          }
        } catch (error) {
          console.error("Sidebar Sync Error:", error);
        }
      }
    };
    checkStatus();
  }, [isOpen, userType]);

  // ✅ 2. Handle Mode Switching Logic
  const handleSwitchMode = async () => {
    // 1. If already recognized as a driver, just navigate
    if (userType === "driver" || isDriver || backendStatus === "approved") {
      // ✅ If they are approved on the backend but still saved as a 'passenger' locally
      if (userType === "passenger") {
        try {
          // Use your existing updateUserInfo helper to persist the change
          await updateUserInfo({
            userType: "driver",
          });
          console.log("🚀 Local storage promoted to Driver mode");
        } catch (error) {
          console.error("Failed to update local userType storage:", error);
        }
      }

      router.replace(ROUTES.DRIVER.HOME as never);
      return;
    }

    // Handle Passenger Logic based on verification
    switch (backendStatus) {
      case "pending":
        setModalType("pending");
        setModalContent({
          title: "Review in Progress",
          message:
            "Your registration is being reviewed. This usually takes 24-48 hours. If there is anything you need to correct or do, we will let you know. You will be notified once done.",
        });
        setModalVisible(true);
        break;

      case "rejected":
        setModalType("cancellation"); // Mapping 'rejected' to existing TripStatusModal visual
        setModalContent({
          title: "Registration Declined",
          message:
            rejectionMessage ||
            "Your registration was declined. Please check your details and try again.",
        });
        setModalVisible(true);
        break;

      case "unregistered":
      default:
        router.push(ROUTES.ONBOARDING.DRIVER_ONBOARDING as never);
        break;
    }
  };

  // ✅ 3. Sidebar Animations
  useEffect(() => {
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
  }, [isOpen]);

  const menuItems = [
    { label: "Drift History", screen: "/ride-history", icon: "time" as const },
  ];

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
            <View style={styles.footerActionsRow}>
              <TouchableOpacity
                onPress={() => console.log("Logout triggered")}
                style={styles.circularLogout}
              >
                <LogoutButton />
              </TouchableOpacity>
              <IRButton
                title={
                  ["pending", "rejected", "approved"].includes(backendStatus) ||
                  isDriver
                    ? "Switch to Driver"
                    : "Become a Driver"
                }
                variant="primary"
                size="md"
                onPress={handleSwitchMode}
                style={{ flex: 1 }} // Take up remaining space
              />
            </View>

            <View style={styles.appInfo}>
              <Text style={styles.versionText}>Drift v1.0.0</Text>
              <Text style={styles.websiteText}>www.drift.app</Text>
            </View>
            <View style={styles.socialRow}>
              <TouchableOpacity
                onPress={() => {
                  const message = encodeURIComponent("*Drift Support*\n\n");
                  Linking.openURL(
                    `whatsapp://send?phone=263777937111&text=${message}`,
                  );
                }}
                style={styles.socialIcon}
              >
                <Ionicons name="logo-whatsapp" size={ms(24)} color="#25D366" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL("https://facebook.com/driftapp")} // Replace with your link
                style={styles.socialIcon}
              >
                <Ionicons name="logo-facebook" size={ms(24)} color="#1877F2" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  Linking.openURL("https://linkedin.com/company/driftapp")
                } // Replace with your link
                style={styles.socialIcon}
              >
                <Ionicons name="logo-linkedin" size={ms(24)} color="#0A66C2" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* ✅ Registration Status Modal */}
      <TripStatusModal
        visible={modalVisible}
        type={modalType}
        title={modalContent.title}
        message={modalContent.message}
        onClose={() => {
          setModalVisible(false);
          // If rejected, redirect to onboarding after they close the modal
          if (backendStatus === "rejected") {
            router.push(ROUTES.ONBOARDING.DRIVER_ONBOARDING as never);
          }
        }}
      />
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
  footerContent: {
    padding: s(theme.spacing.lg),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12), // Space between the switch button and logout
  },
  circularLogout: {
    width: ms(48), // Match the height of your IRButton
    height: ms(48),
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: theme.colors.border, // Circle outline
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
  },
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
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: s(25),
    marginTop: vs(20),
    paddingBottom: vs(10),
  },
  socialIcon: {
    padding: s(8),
    // Optional: add a light surface background if you want them to pop
    // backgroundColor: theme.colors.surface,
    // borderRadius: ms(10),
  },
});
