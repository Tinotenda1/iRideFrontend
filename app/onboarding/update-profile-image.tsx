import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IRButton } from '../../components/IRButton';
import { IRHeader } from '../../components/IRHeader';
import { IRLoading } from '../../components/IRLoading';
import { theme } from '../../constants/theme';
import { getUserInfo, storeUserInfo } from '../../utils/storage'; // Removed getAuthToken import
import { createStyles, typedTypography } from '../../utils/styles';

export default function UpdateProfileImage() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasExistingImage, setHasExistingImage] = useState(false);

  useEffect(() => {
    loadUserImage();
    requestCameraPermission();
  }, []);

  const loadUserImage = async () => {
    try {
      const userInfo = await getUserInfo();

      if (userInfo?.profilePic) {
        const profilePic = userInfo.profilePic;
        setProfileImage(profilePic);
        setHasExistingImage(true);
      }
    } catch (error) {
      console.error('Error loading user image:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please grant camera permission to take a selfie for your profile image.', [{ text: 'OK' }]);
    }
  };

  const handleTakeSelfie = async () => {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        await requestCameraPermission();
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        cameraType: ImagePicker.CameraType.front,
        base64: false, // We don't need base64 for local storage
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setProfileImage(asset.uri);
        await saveImageLocally(asset.uri);
      }
    } catch (error: any) {
      console.error('Error taking selfie:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const saveImageLocally = async (imageUri: string) => {
    setUploading(true);
    try {
      // Get user info
      const userInfo = await getUserInfo();
      if (!userInfo) {
        Alert.alert('Error', 'User information not found.');
        return;
      }

      // Store the image URI directly in local storage
      const updatedUserInfo = {
        ...userInfo,
        profilePic: imageUri,
      };
      
      await storeUserInfo(updatedUserInfo);
      
      // Update state
      setProfileImage(imageUri);
      setHasExistingImage(true);

      Alert.alert('Success', 'Profile image saved!');
    } catch (error: any) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    router.push('/onboarding/user-type-selection' as any);
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <IRLoading text="Loading your profile..." overlay />
      </SafeAreaView>
    );
  }

  const hasImage = !!profileImage;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>

          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Screen Heading */}
          <IRHeader
            title={hasExistingImage ? 'Your Profile Image' : 'Set up your profile image'}
            subtitle={hasExistingImage ? 'We found your existing profile image' : undefined}
          />

          {/* Image */}
          <View style={styles.imageSection}>
            <View style={styles.imageWrapper}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons name="person" size={80} color={theme.colors.textSecondary} />
                </View>
              )}
            </View>
          </View>

          {/* Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              {hasExistingImage
                ? "This is your current profile image. You can update it if you'd like, or keep it as is."
                : "Setting up a profile image is recommended and will help you get more rides and be prioritized by drivers. You can always set it up later by going to Settings > Profile."
              }
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <IRButton
              title={hasImage ? 'Update Image' : 'Set Image'}
              onPress={handleTakeSelfie}
              variant="outline"
              loading={uploading}
              disabled={uploading}
              fullWidth
              leftIcon={<Ionicons name="camera" size={20} color={theme.colors.primary} />}
            />

            <IRButton
              title={hasExistingImage ? "Continue" : "Skip for now"}
              onPress={handleNext}
              variant="primary"
              disabled={uploading}
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
    paddingTop: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSection: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  imageWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  messageContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  message: {
    ...typedTypography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
});