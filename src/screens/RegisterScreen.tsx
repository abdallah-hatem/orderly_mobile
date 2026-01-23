import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../api/client';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !name) return;
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password, name });
      Alert.alert('Success', 'Account created! Please login.');
      navigation.navigate('Login');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-6 justify-center">
        <Text className="text-3xl font-bold mb-8 text-black">Create Account</Text>
        
        <View className="mb-4">
          <Text className="text-gray-600 mb-1">Full Name</Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
          />
        </View>

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
          <Text className="text-gray-600 mb-1">Password (min 6 chars)</Text>
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
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Register</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
