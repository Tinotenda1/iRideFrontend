// components/ProfileHeader.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Image, Modal, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { getUserInfo } from '../utils/storage';
import { createStyles, typedTypography } from '../utils/styles';
import { IRAvatar } from './IRAvatar';

interface ProfileHeaderProps {
  showRating?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical';
}

interface UserProfileData {
  name: string;
  profilePic?: string;
  rating?: number;
  userType?: 'passenger' | 'driver';
}

// Fixed avatar sizes in pixels
const AVATAR_SIZE_PX = {
  sm: 40,
  md: 56,
  lg: 72,
};

const getAvatarPixelSize = (size: 'sm' | 'md' | 'lg') => AVATAR_SIZE_PX[size] || AVATAR_SIZE_PX.md;

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  showRating = true,
  size = 'md',
  layout = 'horizontal',
}) => {
  const [userData, setUserData] = React.useState<UserProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showImageModal, setShowImageModal] = React.useState(false);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userInfo = await getUserInfo();
      if (userInfo) {
        setUserData({
          name: userInfo.name || 'User',
          profilePic: userInfo.profilePic,
          rating: 4.8, // default, can fetch from API
          userType: userInfo.userType,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const avatarPixelSize = getAvatarPixelSize(size);

  const getTextSize = () => {
    switch (size) {
      case 'sm': return styles.textSmall;
      case 'md': return styles.textMedium;
      case 'lg': return styles.textLarge;
      default: return styles.textMedium;
    }
  };

  const STAR_COLOR = theme.colors.primary;

  const renderStars = (rating: number) => {
    try {
      const stars = [];
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 >= 0.5;

      for (let i = 0; i < fullStars; i++) {
        stars.push(
          <Ionicons 
            key={`full-${i}`} 
            name="star" 
            size={14} 
            color={STAR_COLOR} 
          />
        );
      }
      
      if (hasHalfStar) {
        stars.push(
          <Ionicons 
            key="half" 
            name="star-half" 
            size={14} 
            color={STAR_COLOR} 
          />
        );
      }
      
      const emptyStars = 5 - stars.length;
      for (let i = 0; i < emptyStars; i++) {
        stars.push(
          <Ionicons 
            key={`empty-${i}`} 
            name="star-outline" 
            size={14} 
            color={theme.colors.border} 
          />
        );
      }
      return stars;
    } catch (error) {
      console.error('Error rendering stars:', error);
      return null;
    }
  };

  const handleAvatarPress = () => {
    if (userData?.profilePic) setShowImageModal(true);
  };
  
  const closeImageModal = () => setShowImageModal(false);

  // Skeleton while loading
  if (loading || !userData) {
    return (
      <View style={[styles.container, layout === 'vertical' && styles.verticalLayout]}>
        <View style={[styles.skeletonAvatar, { width: avatarPixelSize, height: avatarPixelSize, borderRadius: avatarPixelSize / 2 }]} />
        <View style={styles.skeletonText}>
          <View style={styles.skeletonName} />
          {showRating && <View style={styles.skeletonRating} />}
        </View>
      </View>
    );
  }

  // Safe render for IRAvatar with fallback
  const renderAvatar = () => {
    try {
      return (
        <IRAvatar
          source={userData.profilePic ? { uri: userData.profilePic } : undefined}
          name={userData.name}
          size={size}
          variant="circle"
        />
      );
    } catch (error) {
      console.error('Error rendering IRAvatar:', error);
      return (
        <View style={[styles.fallbackAvatar, { width: avatarPixelSize, height: avatarPixelSize, borderRadius: avatarPixelSize / 2 }]}>
          <Text style={styles.fallbackAvatarText}>
            {userData.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    }
  };

  return (
    <>
      <View style={[styles.container, layout === 'vertical' && styles.verticalLayout]}>
        <TouchableOpacity 
          onPress={handleAvatarPress} 
          disabled={!userData.profilePic}
          activeOpacity={0.7}
        >
          {renderAvatar()}
        </TouchableOpacity>

        <View style={[styles.textContainer, layout === 'vertical' && styles.verticalTextContainer]}>
          <Text style={[styles.userName, getTextSize()]} numberOfLines={1}>
            {userData.name}
          </Text>

          {showRating && userData.rating && (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(userData.rating)}
              </View>
              <Text style={styles.ratingText}>{userData.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>(125)</Text>
            </View>
          )}

          {userData.userType && (
            <Text style={styles.userType}>
              {userData.userType === 'driver' ? '🚗 Driver' : '👤 Passenger'}
            </Text>
          )}
        </View>
      </View>

      {/* Full-screen image modal */}
      <Modal 
        visible={showImageModal} 
        transparent 
        animationType="fade" 
        statusBarTranslucent 
        onRequestClose={closeImageModal}
      >
        <TouchableOpacity 
          style={styles.fullScreenContainer} 
          activeOpacity={1} 
          onPress={closeImageModal}
        >
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <BlurView intensity={90} tint="light" style={styles.blurBackground} />
          <View style={styles.imageContent}>
            {userData.profilePic && (
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()} 
                style={[styles.imageWrapper, { width: avatarPixelSize * 2, height: avatarPixelSize * 2, borderRadius: avatarPixelSize }]}
              >
                <Image 
                  source={{ uri: userData.profilePic }} 
                  style={styles.fullScreenImage} 
                  resizeMode="cover" 
                  onError={(error) => {
                    console.error('Error loading image:', error);
                    closeImageModal();
                  }}
                />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = createStyles({
  container: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  verticalLayout: { 
    flexDirection: 'column', 
    alignItems: 'center' 
  },
  textContainer: { 
    marginLeft: theme.spacing.md 
  },
  verticalTextContainer: { 
    marginLeft: 0, 
    marginTop: theme.spacing.sm, 
    alignItems: 'center' 
  },
  userName: { 
    fontWeight: '600', 
    color: theme.colors.text 
  },
  textSmall: { 
    fontSize: 14 
  },
  textMedium: { 
    fontSize: 16 
  },
  textLarge: { 
    fontSize: 18 
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: theme.spacing.xs, 
    gap: theme.spacing.xs 
  },
  starsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 2 
  },
  ratingText: { 
    ...typedTypography.caption, 
    color: theme.colors.text, 
    fontWeight: '600', 
    marginLeft: theme.spacing.xs 
  },
  ratingCount: { 
    ...typedTypography.caption, 
    color: theme.colors.textSecondary 
  },
  userType: { 
    ...typedTypography.caption, 
    color: theme.colors.textSecondary, 
    marginTop: theme.spacing.xs 
  },
  fullScreenContainer: { 
    flex: 1 
  },
  blurBackground: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  imageContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: theme.spacing.lg 
  },
  imageWrapper: { 
    overflow: 'hidden', 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fullScreenImage: { 
    width: '100%', 
    height: '100%' 
  },
  skeletonAvatar: { 
    backgroundColor: theme.colors.border 
  },
  skeletonText: { 
    marginLeft: theme.spacing.md 
  },
  skeletonName: { 
    width: 120, 
    height: 16, 
    backgroundColor: theme.colors.border, 
    borderRadius: 4, 
    marginBottom: 4 
  },
  skeletonRating: { 
    width: 80, 
    height: 12, 
    backgroundColor: theme.colors.border, 
    borderRadius: 4 
  },
  fallbackAvatar: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});