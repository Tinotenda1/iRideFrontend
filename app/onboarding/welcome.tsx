// app/onboarding/welcome.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IRButton } from '../../components/IRButton';
import { IRHeader } from '../../components/IRHeader';
import { IRInput } from '../../components/IRInput';
import { IRLoading } from '../../components/IRLoading';
import SearchableCity from '../../components/SearchableCity';
import { theme } from '../../constants/theme';
import { api } from '../../utils/api';
import {
  createUserInfoFromResponse,
  getUserInfo,
  storeUserInfo,
} from '../../utils/storage';
import { createStyles } from '../../utils/styles';

interface UserData {
  userId?: number;
  name?: string;
  city?: string;
  phone?: string;
  exists: boolean;
}

export default function Welcome() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const phone = Array.isArray(params.phone) ? params.phone[0] : params.phone;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState<UserData>({ exists: false });
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<{ name?: string; city?: string }>({});

  // Load user profile from storage or API
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userInfo = await getUserInfo();

        if (userInfo) {
          // Check if user has name in database (not just in storage)
          // A user "exists" in database if they have a name
          const userHasName = !!userInfo.name && userInfo.name.trim().length > 0;
          
          if (userHasName) {
            // User exists in database - show personalized greeting
            setUserData({
              exists: true,
              userId: userInfo.id,
              name: userInfo.name,
              city: userInfo.city,
              phone: userInfo.phone,
            });
            
            // Set city from existing data if available
            if (userInfo.city) setCity(userInfo.city);
            // Don't set name because user already has one
          } else {
            // User doesn't have name in database - treat as new user
            setUserData({
              exists: false,
              userId: userInfo.id,
              phone: userInfo.phone,
            });
            
            // Set name from storage if available (for pre-filling form)
            if (userInfo.name) setName(userInfo.name);
            if (userInfo.city) setCity(userInfo.city);
          }
          
          setLoading(false);
          return;
        }

        // If no stored info, fetch from API
        try {
          const response = await api.get('/auth/profile');

          if (response.data?.user) {
            const userInfo = createUserInfoFromResponse(response.data.user, phone);
            
            // Check if user has name in database
            const userHasName = !!userInfo.name && userInfo.name.trim().length > 0;
            
            await storeUserInfo(userInfo);
            
            if (userHasName) {
              // User exists in database
              setUserData({
                exists: true,
                userId: userInfo.id,
                name: userInfo.name,
                city: userInfo.city,
                phone: userInfo.phone,
              });
              if (userInfo.city) setCity(userInfo.city);
            } else {
              // New user
              setUserData({
                exists: false,
                userId: userInfo.id,
                phone: userInfo.phone,
              });
              if (userInfo.name) setName(userInfo.name);
              if (userInfo.city) setCity(userInfo.city);
            }
          } else {
            // New user - no data from API
            setUserData({ 
              exists: false, 
              phone: phone 
            });
          }
        } catch (error: any) {
          if (error?.response?.status === 404 || error?.response?.status === 401) {
            // New user - not found in database
            setUserData({ 
              exists: false, 
              phone: phone 
            });
          } else {
            console.error('Error fetching user profile:', error);
            setUserData({ 
              exists: false, 
              phone: phone 
            });
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserData({ 
          exists: false, 
          phone: phone 
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [phone]);

  const validateForm = (): boolean => {
    const newErrors: { name?: string; city?: string } = {};

    // Only validate name if user doesn't exist in database
    if (!userData.exists && !name.trim()) newErrors.name = 'Please enter your name';
    if (!city.trim()) newErrors.city = 'Please enter your city';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save user info and go to next
  const handleNext = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const storedUserInfo = await getUserInfo();
      
      // Always ensure phone is set
      const phoneToUse = phone || storedUserInfo?.phone || userData.phone;
      
      if (!phoneToUse) {
        Alert.alert('Error', 'Phone number is missing.');
        return;
      }

      const updatedUserInfo = {
        ...(storedUserInfo ?? {}),
        id: storedUserInfo?.id || userData.userId,
        phone: phoneToUse,
        name: userData.exists ? storedUserInfo?.name || userData.name : name.trim(),
        firstName: userData.exists ? storedUserInfo?.firstName : firstName,
        lastName: userData.exists ? storedUserInfo?.lastName : lastName,
        city: city.trim(),
        exists: true, // Now they will exist after this step
      };

      await storeUserInfo(updatedUserInfo);

      router.push('/onboarding/update-profile-image' as any);
    } catch (error) {
      console.error('Error storing user info:', error);
      Alert.alert('Error', 'Failed to save your information. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <IRLoading text="Loading your profile..." overlay />
      </SafeAreaView>
    );
  }

  const heading = userData.exists && userData.name
    ? `Welcome back, ${userData.name}!`
    : 'Welcome!';

  const message = userData.exists
    ? "We'd love to know your city to help you find the best rides nearby."
    : "Let's get to know you! Please share your name and city to personalize your experience.";

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <IRHeader title={heading} subtitle={message} />

          <View style={styles.form}>
            {/* Only show name input if user doesn't exist in database */}
            {!userData.exists && (
              <IRInput
                placeholder="Enter your full name"
                value={name}
                onChangeText={(text: string) => {
                  setName(text);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
                error={errors.name}
                autoFocus={true}
                autoCapitalize="words"
              />
            )}

            <SearchableCity
              placeholder="Search for your city..."
              value={city}
              onChangeText={(text: string) => {
                setCity(text);
                if (errors.city) setErrors({ ...errors, city: undefined });
              }}
              error={errors.city}
              autoFocus={userData.exists} // Auto-focus city if user exists
            />
          </View>

          <View style={styles.buttonContainer}>
            <IRButton
              title="Next"
              onPress={handleNext}
              variant="primary"
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = createStyles({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  form: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
  },
});