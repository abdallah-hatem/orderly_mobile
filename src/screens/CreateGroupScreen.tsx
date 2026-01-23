import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../api/client';

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await api.post('/groups', { name, description });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <View className="mb-4">
        <Text className="text-gray-600 mb-1">Group Name</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3"
          placeholder="Friday Lunch Crew"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="mb-8">
        <Text className="text-gray-600 mb-1">Description (Optional)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 h-24 text-top"
          placeholder="splitting burgers since 2024"
          multiline
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity 
        className="bg-black p-4 rounded-lg items-center"
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Create Group</Text>}
      </TouchableOpacity>
    </View>
  );
}
