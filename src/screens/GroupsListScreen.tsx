import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Alert } from 'react-native';
import { Plus, Users, Crown } from 'lucide-react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Group } from '../types';

export default function GroupsListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    fetchData(); // Initial fetch

    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);





  const renderGroup = ({ item }: { item: Group }) => {
    const creator = item.members
      .filter(m => m.status === 'ACCEPTED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    
    const isCreator = creator?.userId === user?.id;

    return (
      <TouchableOpacity 
        className="bg-white p-4 mb-3 rounded-xl border border-gray-100 shadow-sm"
        onPress={() => navigation.navigate('GroupDetails', { groupId: item.id, name: item.name })}
      >
        <View className="flex-row items-center">
          <View className="bg-gray-100 p-3 rounded-full mr-4">
            <Users size={24} color="black" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
                <Text className="text-lg font-bold text-black mr-2">{item.name}</Text>
                {isCreator && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full flex-row items-center">
                        <Crown size={12} color="#d97706" />
                        <Text className="text-amber-700 text-[10px] font-bold ml-1 uppercase">Creator</Text>
                    </View>
                )}
            </View>
            <Text className="text-gray-500">{item.members.length} members</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >


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
