// app/onboarding/user-type-selection.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IRHeader } from '../../components/IRHeader';
import { theme } from '../../constants/theme';
import { api } from '../../utils/api';
import { ROUTES } from '../../utils/routes';
import { completeOnboarding, getUserInfo, updateUserInfo } from '../../utils/storage';
import { createStyles, typedTypography } from '../../utils/styles';

type UserType = 'passenger' | 'driver';

export default function UserTypeSelection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<UserType | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Final submit to backend
  const completeUserProfile = useCallback(async (payload: any) => {
    try {
      console.log('✅✅✅ Submitting user data to backend: '+ payload);
      const response = await api.post('/auth/complete-profile', payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ Profile completion API error:', error);
      throw error;
    }
  }, []);

  const handleUserTypeSelect = useCallback(
    async (type: UserType) => {
      setLoading(true);
      setSelectedType(type);

      try {
        const userInfo = await getUserInfo();

        if (!userInfo) {
          throw new Error('No user information found');
        }

        const payload = {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          city: userInfo.city,
          userType: type,
          profilePic: userInfo.profilePic,
          profileCompleted: true,
        };

        console.log('📤 Submitting profile...', payload);

        const response = await completeUserProfile(payload);
        console.log('✅ Profile update response:', response);

        await updateUserInfo({ ...userInfo, ...payload });
        await completeOnboarding({ userType: type });

        const dashboardRoute = type === 'driver'
          ? ROUTES.DRIVER.HOME
          : ROUTES.PASSENGER.HOME;

        router.replace(dashboardRoute as any);
      } catch (error) {
        console.error('❌ Failed onboarding:', error);
        Alert.alert('Error', 'Failed to complete profile. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [router, completeUserProfile]
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={loading}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={loading ? theme.colors.textSecondary : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <IRHeader
          title="Choose your role"
          subtitle="How would you like to use iRide?"
        />

        <View style={styles.selectionContainer}>
          {/* Passenger */}
          <TouchableOpacity
            style={[
              styles.selectionCard,
              selectedType === 'passenger' && styles.selectedCard,
              loading && styles.disabledCard,
            ]}
            onPress={() => handleUserTypeSelect('passenger')}
            disabled={loading}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Passenger</Text>
            <Text style={styles.cardDescription}>Book rides and travel safely</Text>
            {selectedType === 'passenger' && !loading && (
              <View style={styles.selectionIndicator}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Driver */}
          <TouchableOpacity
            style={[
              styles.selectionCard,
              selectedType === 'driver' && styles.selectedCard,
              loading && styles.disabledCard,
            ]}
            onPress={() => handleUserTypeSelect('driver')}
            disabled={loading}
          >
            <View style={[styles.cardIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
              <Ionicons name="car" size={32} color={theme.colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Driver</Text>
            <Text style={styles.cardDescription}>Earn money by driving</Text>
            {selectedType === 'driver' && !loading && (
              <View style={[styles.selectionIndicator, { backgroundColor: theme.colors.secondary }]}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <Text style={styles.loadingText}>Completing your profile...</Text>
              <Text style={styles.loadingSubtext}>Please wait while your account is being set up.</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  selectionContainer: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  selectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    ...theme.shadows.md,
    position: 'relative',
  },
  selectedCard: {
    borderColor: theme.colors.primary,
  },
  disabledCard: {
    opacity: 0.7,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  cardDescription: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  loadingText: {
    ...typedTypography.h2,
    color: theme.colors.text,
  },
  loadingSubtext: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
