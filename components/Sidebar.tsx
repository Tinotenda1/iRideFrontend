// app/driver/components/DriverSideBar.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { ROUTES } from '../utils/routes';
import { createStyles, typedTypography } from '../utils/styles';
import { IRButton } from './IRButton';
import { LogoutButton } from './Logout';
import { ProfileHeader } from './ProfileHeader';

interface SidebarProps {
  userType: 'passenger' | 'driver';
  userName?: string;
  userRating?: number;
  userImage?: string;
}

export default React.forwardRef(function Sidebar(
  { userType, userName, userRating = 4.8, userImage }: SidebarProps,
  ref
) {
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
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
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(overlayOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: -300, useNativeDriver: true, tension: 60, friction: 10 }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen, slideAnim, overlayOpacity]);

  const menuItems = [
    { label: 'Home', screen: userType === 'passenger' ? '/passenger' : '/driver', icon: 'home' as const },
    { label: 'Ride History', screen: '/ride-history', icon: 'time' as const },
    { label: 'Payment Methods', screen: '/payment-methods', icon: 'card' as const },
    { label: 'Promotions', screen: '/promotions', icon: 'gift' as const },
    { label: 'Support', screen: '/support', icon: 'help-circle' as const },
    { label: 'Settings', screen: '/settings', icon: 'settings' as const },
  ];

  /**
 * Ensure driver socket is fully disconnected
 * before role switching or logout
 */
const safelyDisconnectDriver = () => {
  console.log('🔌 Sidebar: disconnecting driver socket');
};


  return (
    <>
      {/* Overlay */}
      <Animated.View pointerEvents={isOpen ? 'auto' : 'none'} style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={() => setIsOpen(false)} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }], shadowOpacity: isOpen ? 0.3 : 0 }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.userInfo}>
                <ProfileHeader showRating size="lg" layout="horizontal" />
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false} bounces>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={() => console.log(`Navigating to: ${item.screen}`)} activeOpacity={0.7}>
                <Ionicons name={item.icon} size={20} color={theme.colors.textSecondary} style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.border} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footerContent}>
            <IRButton
              title="Login as Driver"
              variant="primary"
              size="md"
              fullWidth
              onPress={() => {
                safelyDisconnectDriver();

                const dashboardRoute =
                  userType === 'passenger'
                    ? ROUTES.DRIVER.HOME
                    : ROUTES.PASSENGER.HOME;

                console.log('🔁 Switching role → driver disconnected');

                router.replace({
                  pathname: dashboardRoute,
                  params: { switchingFromDriver: true },
                } as never);
              }}
            />
            <TouchableOpacity
              onPress={() => {
                safelyDisconnectDriver();
              }}
            >
              <LogoutButton />
            </TouchableOpacity>

            <View style={styles.appInfo}>
              <Text style={styles.versionText}>iRide v1.0.0</Text>
              <Text style={styles.websiteText}>www.iride.co.zw</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </>
  );
});

const styles = createStyles({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'black', zIndex: 999999 },
  overlayTouchable: { flex: 1 },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    backgroundColor: theme.colors.background,
    zIndex: 1000000,
    ...theme.shadows.lg,
    borderTopRightRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: 10,
  },
  safeArea: { flex: 1 },
  header: { padding: theme.spacing.lg, backgroundColor: theme.colors.surface },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  closeButton: { padding: theme.spacing.xs, marginLeft: theme.spacing.sm, borderRadius: theme.borderRadius.sm },
  menuScroll: { flex: 1, backgroundColor: theme.colors.surface },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuIcon: { marginRight: theme.spacing.md, width: 24 },
  menuText: { ...typedTypography.body, color: theme.colors.text, flex: 1, fontWeight: '500' },
  footerContent: { padding: theme.spacing.lg },
  appInfo: { alignItems: 'center', marginTop: theme.spacing.lg },
  versionText: { ...typedTypography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs, fontWeight: '500' },
  websiteText: { ...typedTypography.caption, color: theme.colors.textSecondary, fontWeight: '500' },
});
