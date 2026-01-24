import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, TextInput } from 'react-native';
import api from '../api/client';
import { Restaurant } from '../types';

export default function RestaurantSelectionScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [customName, setCustomName] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      // Start order on backend
      const { data } = await api.post('/orders', { groupId, restaurantId });
      navigation.navigate('Menu', { orderId: data.id, restaurantId });
    } catch (error: any) {
       console.error(error.response?.data?.message);
    } finally {
        setSubmitting(false);
    }
  };

  const handleCustomSubmit = async () => {
    if (!customName.trim()) return;
    setSubmitting(true);
    try {
        const { data } = await api.post('/orders', { 
            groupId, 
            customRestaurantName: customName.trim() 
        });
        navigation.navigate('Menu', { orderId: data.id, restaurantId: null });
    } catch (error) {
        console.error(error);
    } finally {
        setSubmitting(false);
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
          ListHeaderComponent={
              <View>
                  <Text className="text-gray-500 mb-4 px-1">Available for delivery to your group</Text>
                  
                  <View className="bg-white p-4 rounded-2xl mb-6 shadow-sm border border-gray-100">
                      <Text className="font-bold text-lg mb-2">Can't find it?</Text>
                      <Text className="text-gray-500 text-sm mb-4">You can still start an order by typing the name manually.</Text>
                      <TextInput 
                          className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4"
                          placeholder="Enter restaurant name..."
                          value={customName}
                          onChangeText={setCustomName}
                      />
                      <TouchableOpacity 
                          className={`p-4 rounded-xl items-center ${!customName.trim() || submitting ? 'bg-gray-200' : 'bg-black'}`}
                          disabled={!customName.trim() || submitting}
                          onPress={handleCustomSubmit}
                      >
                          <Text className={`font-bold ${!customName.trim() || submitting ? 'text-gray-400' : 'text-white'}`}>
                              {submitting ? 'Starting...' : 'Start with Custom Name'}
                          </Text>
                      </TouchableOpacity>
                  </View>

                  <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 px-1">Or choose featured</Text>
              </View>
          }
        />
      )}
    </View>
  );
}
