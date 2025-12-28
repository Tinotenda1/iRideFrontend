// components/Logout.tsx - Safe Version
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { theme } from '../constants/theme';
import { ROUTES } from '../utils/routes';
import { clearAuthData } from '../utils/storage';

export const LogoutButton: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => setIsLoading(false)
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      setIsLoading(true);
      await clearAuthData();
      router.replace(ROUTES.ONBOARDING.GET_STARTED as never);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
      setIsLoading(false);
    }
  };

  // Return minimal, safe JSX
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleLogout}
        style={styles.touchable}
        disabled={isLoading}
      >
        <View style={styles.content}>
          <Text style={styles.text}>Logout</Text>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Use very basic styles
const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  touchable: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  iconPlaceholder: {
    marginLeft: 8,
  },
  arrow: {
    fontSize: 18,
    color: '#666',
  },
});