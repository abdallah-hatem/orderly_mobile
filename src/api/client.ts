import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

// IMPORTANT: Replace this with your computer's local IP address
// To find it: 
// - macOS: System Settings > Network > Your connection > IP address
// - Windows: Run 'ipconfig' in CMD and look for IPv4 Address

const getBaseUrl = () => {
    return process.env.EXPO_PUBLIC_BASE_URL;

  // if (process.env.NODE_ENV !== 'development') {
  //   return process.env.EXPO_PUBLIC_BASE_URL;
  // }

  // // iOS Simulator can use localhost
  // return 'http://localhost:3000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't alert for 401 (Unauthorized) as it's usually handled by redirecting to login
    if (error.response && error.response.status === 401) {
      return Promise.reject(error);
    }
    
    // Show alert for other errors
    const message = error.response?.data?.message || 'Something went wrong';
    // Ensure message is a string, sometimes NestJS returns an array of messages
    const alertMessage = Array.isArray(message) ? message[0] : message;
    
    Alert.alert('Error', typeof alertMessage === 'string' ? alertMessage : 'An unexpected error occurred');
    
    return Promise.reject(error);
  }
);

export default api;
