import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import api from '../api/client';
import { Restaurant } from '../types';

export default function RestaurantSelectionScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data } = await api.get('/restaurants');
      setRestaurants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (restaurantId: string) => {
    try {
      // Start order on backend
      const { data } = await api.post('/orders', { groupId, restaurantId });
      navigation.navigate('Menu', { orderId: data.id, restaurantId });
    } catch (error: any) {
      // If order already exists, handle it (simplified for MVP: just go to menu if possible)
       console.error(error.response?.data?.message);
       // Ideally we'd fetch the active order ID here
    }
  };

  const renderItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity 
      className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm border border-gray-100"
      onPress={() => handleSelect(item.id)}
    >
      <View className="h-40 bg-gray-200">
        {item.imageUrl && <Image source={{ uri: item.imageUrl }} className="w-full h-full" />}
      </View>
      <View className="p-4">
        <Text className="text-xl font-bold text-black">{item.name}</Text>
        <Text className="text-gray-500 mt-1">{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {loading ? (
        <ActivityIndicator size="large" color="black" className="mt-10" />
      ) : (
        <FlatList
          data={restaurants}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<Text className="text-gray-500 mb-4 px-1">Available for delivery to your group</Text>}
        />
      )}
    </View>
  );
}
