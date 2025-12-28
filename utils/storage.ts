// utils/storage.ts
import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from './api';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_INFO_KEY = 'user_info';
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const DEVICE_ID_KEY = 'device_id';

export interface UserInfo {
  // Core identification
  id?: number;
  phone: string;
  
  // Verification fields
  phoneVerified?: boolean;
  verificationMethod?: 'sms' | 'whatsapp';
  verificationCode?: string;
  verificationCodeExpires?: string;
  currentDeviceId?: string;
  
  // Profile information
  name?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  profilePic?: string;
  
  // User type and status
  userType?: 'passenger' | 'driver';
  status?: 'active' | 'inactive' | 'suspended';
  
  // Profile completion
  profileCompleted?: boolean;
  exists: boolean;
  
  // Ratings and stats
  rating?: number;
  totalTrips?: number;
  iPoints?: number;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  
  // Legacy/derived fields (for backward compatibility)
  deviceId?: string; // Same as currentDeviceId, kept for backward compatibility
}

// ✅ Generate or get device ID (like WhatsApp)
export const getOrCreateDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      console.log('📱 New device ID created:', deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return `fallback_${Date.now()}`;
  }
};

// ✅ Check if current device matches stored device ID
export const validateDeviceId = async (): Promise<{
  isValid: boolean;
  isNewDevice: boolean;
}> => {
  try {
    const [currentDeviceId, userInfo] = await Promise.all([
      getOrCreateDeviceId(),
      getUserInfo()
    ]);

    // If no user info, this is first time login
    if (!userInfo) {
      return { isValid: true, isNewDevice: true };
    }

    // Check both deviceId (legacy) and currentDeviceId (new)
    const storedDeviceId = userInfo.currentDeviceId || userInfo.deviceId;
    
    // If no stored device ID, this might be migration from old version
    if (!storedDeviceId) {
      // Update with current device ID (store in both fields for compatibility)
      await updateUserInfo({ 
        currentDeviceId: currentDeviceId,
        deviceId: currentDeviceId // Legacy field
      });
      return { isValid: true, isNewDevice: false };
    }

    // Check if device IDs match
    const isValid = storedDeviceId === currentDeviceId;
    
    console.log('🔍 Device validation:', {
      storedDeviceId,
      currentDeviceId,
      isValid
    });

    return { 
      isValid, 
      isNewDevice: !isValid 
    };
  } catch (error) {
    console.error('Error validating device ID:', error);
    return { isValid: false, isNewDevice: true };
  }
};

// ✅ Enhanced device mismatch handler
export const handleDeviceMismatch = async (): Promise<void> => {
  console.log('📱 Device mismatch - clearing auth data...');
  await clearAuthData();
};

// ✅ Check if current device is valid (for manual checks)
export const isCurrentDeviceValid = async (): Promise<boolean> => {
  try {
    const deviceValidation = await validateDeviceId();
    return deviceValidation.isValid;
  } catch (error) {
    console.error('Error checking device validity:', error);
    return false;
  }
};

// ✅ Check if onboarding is completed
export const getOnboardingCompleted = async (): Promise<boolean> => {
  try {
    const completed = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

// ✅ Mark onboarding as completed
export const setOnboardingCompleted = async (): Promise<void> => {
  try {
    await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, 'true');
    console.log('✅ Onboarding marked as completed');
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    throw error;
  }
};

// ✅ Clear onboarding status (for logout)
export const clearOnboardingCompleted = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_COMPLETED_KEY);
    console.log('✅ Onboarding status cleared');
  } catch (error) {
    console.error('Error clearing onboarding status:', error);
  }
};

// ✅ Check if user is authenticated and onboarding completed
export const checkUserSession = async (): Promise<{
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  userInfo: UserInfo | null;
}> => {
  try {
    const [token, userInfo, onboardingCompleted] = await Promise.all([
      getAuthToken(),
      getUserInfo(),
      getOnboardingCompleted()
    ]);

    const session = {
      isAuthenticated: !!token,
      onboardingCompleted,
      userInfo
    };

    console.log('🔐 Session check result:', {
      hasToken: !!token,
      onboardingCompleted,
      hasUserInfo: !!userInfo,
      userId: userInfo?.id,
      userPhone: userInfo?.phone,
      userName: userInfo?.name,
      userType: userInfo?.userType,
      status: userInfo?.status,
      rating: userInfo?.rating,
      totalTrips: userInfo?.totalTrips,
      iPoints: userInfo?.iPoints,
      deviceId: userInfo?.currentDeviceId || userInfo?.deviceId,
      profileCompleted: userInfo?.profileCompleted,
      phoneVerified: userInfo?.phoneVerified
    });

    return session;
  } catch (error) {
    console.error('Error checking user session:', error);
    return {
      isAuthenticated: false,
      onboardingCompleted: false,
      userInfo: null
    };
  }
};

// ✅ Check if user needs to complete onboarding
export const needsOnboarding = async (): Promise<boolean> => {
  try {
    const [token, onboardingCompleted] = await Promise.all([
      getAuthToken(),
      getOnboardingCompleted()
    ]);
    
    // User needs onboarding if they have a token but haven't completed onboarding
    return !!token && !onboardingCompleted;
  } catch (error) {
    console.error('Error checking onboarding needs:', error);
    return false;
  }
};

// ✅ Check if user is fully authenticated (logged in + onboarding complete)
export const isUserFullyAuthenticated = async (): Promise<boolean> => {
  try {
    const [token, onboardingCompleted] = await Promise.all([
      getAuthToken(),
      getOnboardingCompleted()
    ]);
    
    return !!token && onboardingCompleted;
  } catch (error) {
    console.error('Error checking full authentication:', error);
    return false;
  }
};

// ✅ Check if user has completed specific onboarding steps
export const getOnboardingProgress = async (): Promise<{
  hasProfileInfo: boolean;
  hasProfilePic: boolean;
  hasUserType: boolean;
  completedSteps: number;
  totalSteps: number;
}> => {
  try {
    const userInfo = await getUserInfo();
    const hasProfileInfo = !!(userInfo?.firstName && userInfo?.city);
    const hasProfilePic = !!userInfo?.profilePic;
    const hasUserType = !!userInfo?.userType;
    
    const completedSteps = [hasProfileInfo, hasProfilePic, hasUserType].filter(Boolean).length;
    const totalSteps = 3;

    return {
      hasProfileInfo,
      hasProfilePic,
      hasUserType,
      completedSteps,
      totalSteps
    };
  } catch (error) {
    console.error('Error getting onboarding progress:', error);
    return {
      hasProfileInfo: false,
      hasProfilePic: false,
      hasUserType: false,
      completedSteps: 0,
      totalSteps: 3
    };
  }
};

// ✅ Get next required onboarding step
export const getNextOnboardingStep = async (): Promise<string> => {
  try {
    const userInfo = await getUserInfo();
    
    if (!userInfo?.firstName || !userInfo?.city) {
      return 'welcome';
    } else if (!userInfo?.profilePic) {
      return 'update-profile-image';
    } else if (!userInfo?.userType) {
      return 'user-type-selection';
    } else {
      return 'completed';
    }
  } catch (error) {
    console.error('Error getting next onboarding step:', error);
    return 'welcome';
  }
};

// Store auth token securely
export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    console.log('✅ Auth token stored successfully');
  } catch (error) {
    console.error('Error storing auth token:', error);
    throw error;
  }
};

// Get auth token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Remove auth token
export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    setAuthToken(null);
    console.log('✅ Auth token removed');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

// Store user info
export const storeUserInfo = async (userInfo: UserInfo): Promise<void> => {
  try {
    // Ensure backward compatibility for deviceId
    const infoToStore = { ...userInfo };
    if (userInfo.currentDeviceId && !userInfo.deviceId) {
      infoToStore.deviceId = userInfo.currentDeviceId;
    } else if (userInfo.deviceId && !userInfo.currentDeviceId) {
      infoToStore.currentDeviceId = userInfo.deviceId;
    }
    
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(infoToStore));
    console.log('✅ User info stored successfully:', {
      id: userInfo.id,
      phone: userInfo.phone,
      name: userInfo.name,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      city: userInfo.city,
      profilePic: userInfo.profilePic,
      userType: userInfo.userType,
      status: userInfo.status,
      rating: userInfo.rating,
      totalTrips: userInfo.totalTrips,
      iPoints: userInfo.iPoints,
      profileCompleted: userInfo.profileCompleted,
      phoneVerified: userInfo.phoneVerified,
      verificationMethod: userInfo.verificationMethod,
      deviceId: infoToStore.currentDeviceId || infoToStore.deviceId,
      exists: userInfo.exists,
      createdAt: userInfo.createdAt,
      updatedAt: userInfo.updatedAt
    });
  } catch (error) {
    console.error('Error storing user info:', error);
    throw error;
  }
};

// Get user info
export const getUserInfo = async (): Promise<UserInfo | null> => {
  try {
    const userInfoString = await SecureStore.getItemAsync(USER_INFO_KEY);
    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString) as UserInfo;
      console.log('📱 Retrieved user info:', {
        id: userInfo.id,
        phone: userInfo.phone,
        name: userInfo.name,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        city: userInfo.city,
        profilePic: userInfo.profilePic,
        userType: userInfo.userType,
        status: userInfo.status,
        rating: userInfo.rating,
        totalTrips: userInfo.totalTrips,
        iPoints: userInfo.iPoints,
        profileCompleted: userInfo.profileCompleted,
        phoneVerified: userInfo.phoneVerified,
        verificationMethod: userInfo.verificationMethod,
        deviceId: userInfo.currentDeviceId || userInfo.deviceId,
        exists: userInfo.exists
      });
      return userInfo;
    }
    return null;
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
};

// Remove user info
export const removeUserInfo = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
    console.log('✅ User info removed');
  } catch (error) {
    console.error('Error removing user info:', error);
  }
};

// ✅ Update specific user info fields
export const updateUserInfo = async (updates: Partial<UserInfo>): Promise<void> => {
  try {
    const currentInfo = await getUserInfo();
    if (currentInfo) {
      // Handle device ID updates for backward compatibility
      if (updates.currentDeviceId && !updates.deviceId) {
        updates.deviceId = updates.currentDeviceId;
      } else if (updates.deviceId && !updates.currentDeviceId) {
        updates.currentDeviceId = updates.deviceId;
      }
      
      const updatedInfo = { ...currentInfo, ...updates };
      await storeUserInfo(updatedInfo);
      console.log('✅ User info updated successfully:', {
        updates: Object.keys(updates),
        newUserType: updatedInfo.userType,
        hasProfilePic: !!updatedInfo.profilePic,
        deviceId: updatedInfo.currentDeviceId || updatedInfo.deviceId,
        status: updatedInfo.status,
        rating: updatedInfo.rating,
        totalTrips: updatedInfo.totalTrips,
        iPoints: updatedInfo.iPoints
      });
    } else {
      throw new Error('No user info found to update');
    }
  } catch (error) {
    console.error('Error updating user info:', error);
    throw error;
  }
};

// ✅ Complete onboarding and mark as completed
export const completeOnboarding = async (userInfoUpdates?: Partial<UserInfo>): Promise<void> => {
  try {
    if (userInfoUpdates) {
      await updateUserInfo(userInfoUpdates);
    }
    await setOnboardingCompleted();
    console.log('🎉 Onboarding completed successfully');
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
};

// Clear all auth data (logout)
export const clearAuthData = async (): Promise<void> => {
  try {
    await Promise.all([
      removeAuthToken(), 
      removeUserInfo(), 
      clearOnboardingCompleted()
    ]);
    console.log('🧹 All auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

// ✅ Get user session summary for debugging
export const getSessionSummary = async (): Promise<{
  hasToken: boolean;
  hasUserInfo: boolean;
  onboardingCompleted: boolean;
  userId?: number;
  userPhone?: string;
  userName?: string;
  userType?: string;
  status?: string;
  rating?: number;
  totalTrips?: number;
  iPoints?: number;
  profileCompleted?: boolean;
  phoneVerified?: boolean;
  deviceId?: string;
}> => {
  try {
    const [token, userInfo, onboardingCompleted] = await Promise.all([
      getAuthToken(),
      getUserInfo(),
      getOnboardingCompleted()
    ]);

    return {
      hasToken: !!token,
      hasUserInfo: !!userInfo,
      onboardingCompleted,
      userId: userInfo?.id,
      userPhone: userInfo?.phone,
      userName: userInfo?.name,
      userType: userInfo?.userType,
      status: userInfo?.status,
      rating: userInfo?.rating,
      totalTrips: userInfo?.totalTrips,
      iPoints: userInfo?.iPoints,
      profileCompleted: userInfo?.profileCompleted,
      phoneVerified: userInfo?.phoneVerified,
      deviceId: userInfo?.currentDeviceId || userInfo?.deviceId
    };
  } catch (error) {
    console.error('Error getting session summary:', error);
    return {
      hasToken: false,
      hasUserInfo: false,
      onboardingCompleted: false
    };
  }
};

export const createUserInfoFromResponse = (backendUser: any, phone: string): UserInfo => {
  const firstName = backendUser?.first_name || backendUser?.firstName || '';
  const lastName = backendUser?.last_name || backendUser?.lastName || '';
  const fullName = firstName ? `${firstName} ${lastName || ''}`.trim() : '';
  
  const userInfo: UserInfo = {
    id: backendUser?.id,
    phone: backendUser?.phone || phone || '',
    name: fullName,
    firstName: firstName,
    lastName: lastName,
    city: backendUser?.city,
    rating: backendUser?.rating,
    totalTrips: backendUser?.total_trips || backendUser?.totalTrips,
    iPoints: backendUser?.i_points || backendUser?.iPoints,
    exists: !!backendUser?.first_name || !!backendUser?.firstName,
    profileCompleted: backendUser?.profile_completed || backendUser?.profileCompleted || false,
    userType: backendUser?.user_type || backendUser?.userType,
    profilePic: backendUser?.profile_pic || backendUser?.profilePic,
    phoneVerified: backendUser?.phone_verified || backendUser?.phoneVerified || false,
    verificationMethod: backendUser?.verification_method || backendUser?.verificationMethod,
    verificationCode: backendUser?.verification_code || backendUser?.verificationCode,
    verificationCodeExpires: backendUser?.verification_code_expires || backendUser?.verificationCodeExpires,
    currentDeviceId: backendUser?.current_device_id || backendUser?.currentDeviceId,
    status: backendUser?.status,
    createdAt: backendUser?.created_at || backendUser?.createdAt,
    updatedAt: backendUser?.updated_at || backendUser?.updatedAt,
    // Legacy field for backward compatibility
    deviceId: backendUser?.current_device_id || backendUser?.currentDeviceId || backendUser?.deviceId
  };

  console.log('👤 Created user info from response:', userInfo);
  return userInfo;
};

// ✅ Validate user info completeness
export const validateUserInfoCompleteness = (userInfo: UserInfo): {
  isValid: boolean;
  missingFields: string[];
} => {
  const missingFields: string[] = [];

  if (!userInfo.firstName) missingFields.push('firstName');
  if (!userInfo.city) missingFields.push('city');
  if (!userInfo.profilePic) missingFields.push('profilePic');
  if (!userInfo.userType) missingFields.push('userType');

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

// ✅ Check if user can proceed to dashboard
export const canProceedToDashboard = async (): Promise<boolean> => {
  try {
    const session = await checkUserSession();
    
    if (!session.isAuthenticated) return false;
    if (!session.onboardingCompleted) return false;
    
    const validation = session.userInfo ? validateUserInfoCompleteness(session.userInfo) : { isValid: false, missingFields: [] };
    
    return validation.isValid;
  } catch (error) {
    console.error('Error checking dashboard eligibility:', error);
    return false;
  }
};