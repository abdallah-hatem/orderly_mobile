import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await signIn(data.access_token, data.user);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6 justify-center">
      <Text className="text-3xl font-bold mb-8 text-black">Welcome Back</Text>
      
      <View className="mb-4">
        <Text className="text-gray-600 mb-1">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3"
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View className="mb-8">
        <Text className="text-gray-600 mb-1">Password</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity 
        className="bg-black p-4 rounded-lg items-center"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Login</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        className="mt-4 items-center"
        onPress={() => navigation.navigate('Register')}
      >
        <Text className="text-gray-600">Don't have an account? <Text className="text-black font-bold">Register</Text></Text>
      </TouchableOpacity>
    </View>
  );
}
