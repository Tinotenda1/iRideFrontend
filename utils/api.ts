// utils/api.ts
import axios from 'axios';
import { router } from 'expo-router';
import { ROUTES } from "../utils/routes";
import { getAuthToken, getOrCreateDeviceId, handleDeviceMismatch, validateDeviceId } from './storage';

export const API_BASE_URL = __DEV__ 
  ? 'http://10.106.89.227:5000'
  : 'https://your-production-urlc.om';

// ✅ CACHE THE TOKEN IN MEMORY
let authToken: string | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL+'/api',
  timeout: 200000,
});

// ✅ Function to handle device mismatch and logout
const handleDeviceMismatchLogout = async (): Promise<void> => {
  console.log('🚫 Device mismatch detected in API call, logging out...');
  await handleDeviceMismatch();
  
  // Navigate to get-started screen
  setTimeout(() => {
    // In handleDeviceMismatchLogout function:
router.replace(ROUTES.ONBOARDING.GET_STARTED as never); // ✅ USE ROUTE CONSTANTS
  }, 100);
};

// ✅ DEVICE VALIDATION REQUEST INTERCEPTOR
api.interceptors.request.use(async (config) => {
  // Skip device check for auth endpoints (login, verify, etc.)
  const isAuthEndpoint = config.url?.includes('/auth/');
  
  if (!isAuthEndpoint) {
    try {
      const deviceValidation = await validateDeviceId();
      
      // If device doesn't match, reject the request
      if (!deviceValidation.isValid) {
        console.log('🔍 Device mismatch detected in API request:', {
          endpoint: config.url,
          isNewDevice: deviceValidation.isNewDevice
        });
        
        // This will trigger the response interceptor
        throw new Error('DEVICE_MISMATCH');
      }
    } catch (error) {
      // ✅ FIXED: Proper error type checking
      if (error instanceof Error && error.message === 'DEVICE_MISMATCH') {
        // Re-throw to be caught by response interceptor
        throw error;
      }
      console.error('Device check error in request interceptor:', error);
    }
  }

  // Add auth token if available
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  
  // ✅ Add device ID to all requests
  try {
    const deviceId = await getOrCreateDeviceId();
    config.headers['X-Device-ID'] = deviceId;
  } catch (error) {
    console.error('Error adding device ID to request:', error);
  }
  
  return config;
});

// ✅ ENHANCED RESPONSE INTERCEPTOR FOR DEVICE MISMATCH
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // ✅ FIXED: Proper error type checking
    if (error instanceof Error && error.message === 'DEVICE_MISMATCH') {
      await handleDeviceMismatchLogout();
      return Promise.reject(new Error('Logged out due to device change'));
    }

    // Handle device mismatch from backend (409 status)
    if (error.response?.status === 409) {
      const errorMessage = error.response.data?.message?.toLowerCase() || '';
      const errorCode = error.response.data?.error?.toLowerCase() || '';
      
      if (errorMessage.includes('device') || errorCode.includes('device') || 
          errorCode === 'device_mismatch') {
        await handleDeviceMismatchLogout();
        return Promise.reject(new Error('Logged out due to device change'));
      }
    }
    
    // Handle token expiry
    if (error?.response?.status === 401) {
      console.log('🔄 Token expired or invalid, clearing auth data');
      await handleDeviceMismatch(); // Clear auth data
    }
    
    return Promise.reject(error);
  }
);

// ✅ INITIALIZE TOKEN ON APP START
export const initializeAuthToken = async (): Promise<void> => {
  try {
    authToken = await getAuthToken();
    console.log('✅ Auth token initialized:', authToken ? 'Token loaded' : 'No token');
  } catch (error) {
    console.error('Error initializing auth token:', error);
    authToken = null;
  }
};

// ✅ UPDATE TOKEN WHEN LOGIN/LOGOUT HAPPENS
export const setAuthToken = (token: string | null): void => {
  authToken = token;
  console.log('✅ Auth token updated in memory:', token ? 'Token set' : 'Token cleared');
};

// ✅ GET CURRENT TOKEN (sync)
export const getCurrentToken = (): string | null => {
  return authToken;
};

// ✅ GET DEVICE ID (for debugging or other uses)
export const getDeviceId = async (): Promise<string> => {
  return await getOrCreateDeviceId();
};

// Send all data to the server to complete user profile
export const completeUserProfile = async (userData: any) => {
  try {
    const response = await api.post('/user/complete-profile', userData);
    return response.data;
  } catch (error) {
    console.error('Error completing user profile:', error);
    throw error;
  }
};