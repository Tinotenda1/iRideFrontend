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

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleUserTypeSelect = useCallback(async (type: UserType) => {
    setLoading(true);
    setSelectedType(type);

    try {
      const userInfo = await getUserInfo();
      if (!userInfo) throw new Error('No user information found');

      const payload = {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        city: userInfo.city,
        userType: type,
        profilePic: userInfo.profilePic,
        profileCompleted: true,
      };

      // API call
      const response = await api.post('/auth/complete-profile', payload);
      console.log('Profile completion response:', response.data);

      // Update local storage
      await updateUserInfo({ ...userInfo, ...payload });
      await completeOnboarding({ userType: type });

      // Navigate to dashboard
      router.replace(type === 'driver' ? ROUTES.DRIVER.HOME : ROUTES.PASSENGER.HOME);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to complete profile';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={loading ? theme.colors.textSecondary : theme.colors.text} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <IRHeader title="Choose your role" subtitle="How would you like to use iRide?" />

        <View style={styles.selectionContainer}>
          {['passenger', 'driver'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.selectionCard,
                selectedType === type && styles.selectedCard,
                loading && styles.disabledCard,
              ]}
              onPress={() => handleUserTypeSelect(type as UserType)}
              disabled={loading}
            >
              <View style={[styles.cardIcon, type === 'driver' && { backgroundColor: theme.colors.secondary + '20' }]}>
                <Ionicons name={type === 'driver' ? 'car' : 'person'} size={32} color={type === 'driver' ? theme.colors.secondary : theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              <Text style={styles.cardDescription}>
                {type === 'driver' ? 'Earn money by driving' : 'Book rides and travel safely'}
              </Text>
              {selectedType === type && !loading && (
                <View style={[styles.selectionIndicator, type === 'driver' && { backgroundColor: theme.colors.secondary }]}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

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
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, ...theme.shadows.sm },
  content: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md },
  selectionContainer: { marginTop: theme.spacing.xl, gap: theme.spacing.lg },
  selectionCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', ...theme.shadows.md, position: 'relative' },
  selectedCard: { borderColor: theme.colors.primary },
  disabledCard: { opacity: 0.7 },
  cardIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.md },
  cardTitle: { ...typedTypography.h2, color: theme.colors.text, marginBottom: theme.spacing.xs, textAlign: 'center' },
  cardDescription: { ...typedTypography.body, color: theme.colors.textSecondary, textAlign: 'center' },
  selectionIndicator: { position: 'absolute', top: theme.spacing.md, right: theme.spacing.md, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  loadingContent: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.xl, alignItems: 'center', ...theme.shadows.md },
  loadingText: { ...typedTypography.h2, color: theme.colors.text },
  loadingSubtext: { ...typedTypography.body, color: theme.colors.textSecondary, textAlign: 'center' },
});
