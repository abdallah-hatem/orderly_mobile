import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Utensils, UserPlus, Info } from 'lucide-react-native';
import api from '../api/client';
import { Group, GroupMember } from '../types';

export default function GroupDetailsScreen({ route, navigation }: any) {
  const { groupId, name } = route.params;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: name });
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setGroup(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroup();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="black" className="mt-10" />;
  if (!group) return <Text className="text-center mt-10">Group not found</Text>;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
      >
        <View className="bg-white p-6 rounded-2xl mb-6 shadow-sm">
          <Text className="text-2xl font-bold text-black mb-2">{group.name}</Text>
          <Text className="text-gray-500 mb-4">{group.description || 'No description'}</Text>
          
          <View className="flex-row border-t border-gray-100 pt-4">
            <View className="flex-1 items-center">
              <Text className="text-xl font-bold">{group.members.length}</Text>
              <Text className="text-gray-500 text-xs">MEMBERS</Text>
            </View>
            <View className="flex-1 items-center border-x border-gray-100">
              <Text className="text-xl font-bold">{group.orders.filter(o => o.status === 'OPEN').length}</Text>
              <Text className="text-gray-500 text-xs">ACTIVE ORDERS</Text>
            </View>
          </View>
        </View>

        {group.orders.some(o => o.status === 'OPEN') ? (
            <TouchableOpacity 
                className="bg-green-600 p-4 rounded-xl flex-row items-center justify-center mb-6"
                onPress={() => navigation.navigate('OrderSummary', { orderId: group.orders.find(o => o.status === 'OPEN')?.id })}
            >
                <Utensils color="white" size={20} className="mr-2" />
                <Text className="text-white font-bold text-lg">Join Active Order</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity 
                className="bg-black p-4 rounded-xl flex-row items-center justify-center mb-6"
                onPress={() => navigation.navigate('RestaurantSelection', { groupId })}
            >
                <Utensils color="white" size={20} className="mr-2" />
                <Text className="text-white font-bold text-lg">Start New Group Order</Text>
            </TouchableOpacity>
        )}

        <Text className="text-lg font-bold mb-3 px-1 text-gray-800">Members</Text>
        <View className="bg-white rounded-2xl p-4 shadow-sm">
            {group.members.map((member: GroupMember) => (
                <View key={member.id} className="flex-row items-center py-2 border-b border-gray-50 last:border-0">
                    <View className="bg-gray-200 w-8 h-8 rounded-full items-center justify-center mr-3">
                        <Text className="text-xs font-bold">{member.user.name.charAt(0)}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="font-medium">{member.user.name}</Text>
                        <Text className="text-xs text-gray-500">{member.status}</Text>
                    </View>
                </View>
            ))}
            <TouchableOpacity 
                className="flex-row items-center py-3 mt-2"
                onPress={() => navigation.navigate('InviteMember', { groupId })}
            >
                <UserPlus size={20} color="black" className="mr-3" />
                <Text className="text-black font-semibold">Invite more friends</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
