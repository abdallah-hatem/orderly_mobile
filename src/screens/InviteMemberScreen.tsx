import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Search, UserPlus, Check } from 'lucide-react-native';
import api from '../api/client';
import { User } from '../types';

export default function InviteMemberScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get(`/users/search?q=${text}`);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      await api.post(`/groups/${groupId}/invite`, { userId });
      Alert.alert('Success', 'Invitation sent!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2 mb-6">
        <Search size={20} color="gray" className="mr-2" />
        <TextInput
          className="flex-1 p-2"
          placeholder="Search by name or email..."
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="black" className="mt-10" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
                <View>
                    <Text className="font-bold text-lg">{item.name}</Text>
                    <Text className="text-gray-500">{item.email}</Text>
                </View>
                <TouchableOpacity 
                    className={`px-4 py-2 rounded-lg flex-row items-center ${inviting === item.id ? 'bg-gray-200' : 'bg-black'}`}
                    onPress={() => handleInvite(item.id)}
                    disabled={!!inviting}
                >
                    {inviting === item.id ? (
                        <ActivityIndicator size="small" color="black" />
                    ) : (
                        <>
                            <UserPlus size={16} color="white" className="mr-2" />
                            <Text className="text-white font-bold">Invite</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            query.length >= 2 ? (
                <Text className="text-center text-gray-500 mt-10">No users found</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
