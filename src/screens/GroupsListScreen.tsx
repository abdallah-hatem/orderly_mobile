import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { Plus, Users } from 'lucide-react-native';
import api from '../api/client';
import { Group } from '../types';

export default function GroupsListScreen({ navigation }: any) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitations, setInvitations] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [groupsRes, invRes] = await Promise.all([
        api.get('/groups'),
        api.get('/groups/invitations')
      ]);
      setGroups(groupsRes.data);
      setInvitations(invRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);



  const handleInviteResponse = async (groupId: string, accept: boolean) => {
    try {
      await api.put(`/groups/${groupId}/respond`, { accept });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      className="bg-white p-4 mb-3 rounded-xl border border-gray-100 shadow-sm"
      onPress={() => navigation.navigate('GroupDetails', { groupId: item.id, name: item.name })}
    >
      <View className="flex-row items-center">
        <View className="bg-gray-100 p-3 rounded-full mr-4">
          <Users size={24} color="black" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-black">{item.name}</Text>
          <Text className="text-gray-500">{item.members.length} members</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderInvitation = ({ item }: { item: Group }) => (
    <View className="bg-amber-50 p-4 mb-3 rounded-xl border border-amber-100">
        <Text className="font-bold text-black mb-1">New Invitation: {item.name}</Text>
        <Text className="text-gray-600 text-sm mb-3">You've been invited to join this group.</Text>
        <View className="flex-row">
            <TouchableOpacity 
                className="bg-black px-4 py-2 rounded-lg mr-2"
                onPress={() => handleInviteResponse(item.id, true)}
            >
                <Text className="text-white font-bold text-xs">Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                className="bg-white border border-gray-300 px-4 py-2 rounded-lg"
                onPress={() => handleInviteResponse(item.id, false)}
            >
                <Text className="text-black font-bold text-xs">Decline</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {invitations.length > 0 && (
            <View className="mb-6">
                <Text className="text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">Invitations</Text>
                {invitations.map(item => (
                    <View key={item.id}>
                        {renderInvitation({ item })}
                    </View>
                ))}
            </View>
        )}

        <Text className="text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">My Groups</Text>
        {loading && !refreshing ? (
            <ActivityIndicator color="black" className="mt-10" />
        ) : (
            groups.map(item => (
                <View key={item.id}>
                    {renderGroup({ item })}
                </View>
            ))
        )}

        {!loading && groups.length === 0 && (
            <View className="mt-10 items-center">
                <Text className="text-gray-500 text-center">No groups yet. Try creating one!</Text>
            </View>
        )}
      </ScrollView>
    </View>
  );
}
