import axios from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ROUTES } from "../utils/routes";
import { getAuthToken, getOrCreateDeviceId, handleDeviceMismatch, validateDeviceId } from './storage';

// ✅ Cache token in memory
let authToken: string | null = null;

// ✅ Always get API base dynamically
export const getApiBaseUrl = () => {
  const url = Constants.expoConfig?.extra?.API_BASE_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) throw new Error('API_BASE_URL not set');
  return url.replace(/\/$/, ''); // remove trailing slash
};

// ✅ Single axios instance
export const api = axios.create({
  timeout: 15000,
});

// ✅ Device mismatch handler
const handleDeviceMismatchLogout = async () => {
  await handleDeviceMismatch();
  setTimeout(() => router.replace(ROUTES.ONBOARDING.GET_STARTED as never), 100);
};

// ✅ Request interceptor
api.interceptors.request.use(async (config) => {
  config.baseURL = config.baseURL || `${getApiBaseUrl()}/api`;

  const isAuth = config.url?.includes('/auth/');
  if (!isAuth) {
    const device = await validateDeviceId();
    if (!device.isValid) throw new Error('DEVICE_MISMATCH');
  }

  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  config.headers['X-Device-ID'] = await getOrCreateDeviceId();

  return config;
});

// ✅ Response interceptor
api.interceptors.response.use(
  res => res,
  async (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data || {};

    // Device mismatch
    if (error instanceof Error && error.message === 'DEVICE_MISMATCH' || 
        status === 409 && (data.error?.toLowerCase() === 'device_mismatch' || data.message?.toLowerCase().includes('device'))) {
      await handleDeviceMismatchLogout();
      return Promise.reject(new Error('Logged out due to device change'));
    }

    // Token expiry
    if (status === 401) await handleDeviceMismatch(); // clear auth

    return Promise.reject(error);
  }
);

// ✅ Token helpers
export const initializeAuthToken = async () => {
  try { authToken = await getAuthToken(); } 
  catch { authToken = null; }
};

export const setAuthToken = (token: string | null) => authToken = token;
export const getCurrentToken = () => authToken;
export const getDeviceId = async () => await getOrCreateDeviceId();

// ✅ Example: complete user profile
export const completeUserProfile = async (userData: any) => {
  const res = await api.post('/user/complete-profile', userData);
  return res.data;
};
