
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import api from '../api/client';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Order } from '../types';

export default function HistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/users/me/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => o.status === 'OPEN');
  const pastOrders = orders.filter(o => o.status !== 'OPEN');
  const displayOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm flex-row items-center"
      onPress={() => {
        if (item.status === 'OPEN') {
           // Navigate to active order flow if possible, or OrderSummary
           // For now, simpler to always go to logic based on status.
           // If OPEN, maybe go to GroupDetails or OrderSummary.
           // Let's assume OrderSummary for checks.
           (navigation as any).navigate('OrderSummary', { orderId: item.id });
        } else {
           // Navigate to Past Order details (to be created)
           (navigation as any).navigate('PastOrder', { orderId: item.id });
        }
      }}
    >
      <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center overflow-hidden mr-4">
        {item.restaurant.imageUrl ? (
          <Image source={{ uri: item.restaurant.imageUrl }} className="w-full h-full" />
        ) : (
          <Text className="text-xl">🍽️</Text>
        )}
      </View>
      <View className="flex-1">
        <Text className="font-bold text-lg">{item.restaurant.name}</Text>
        <Text className="text-gray-500">{item?.group?.name}</Text>
        <Text className="text-xs text-gray-400">{format(new Date(item.createdAt), 'MMM d, h:mm a')}</Text>
      </View>
      <View>
        <View className={clsx(
          "px-2 py-1 rounded-full",
          item.status === 'OPEN' && "bg-green-100",
          item.status === 'CLOSED' && "bg-yellow-100",
          item.status === 'PAID' && "bg-blue-100",
          item.status === 'CANCELLED' && "bg-red-100",
        )}>
          <Text className={clsx(
            "text-xs font-bold",
            item.status === 'OPEN' && "text-green-800",
            item.status === 'CLOSED' && "text-yellow-800",
            item.status === 'PAID' && "text-blue-800",
            item.status === 'CANCELLED' && "text-red-800",
          )}>{item.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row mb-4 bg-gray-200 rounded-lg p-1">
        <TouchableOpacity
          className={clsx("flex-1 py-2 items-center rounded-md", activeTab === 'ACTIVE' ? "bg-white shadow-sm" : "")}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text className={clsx("font-bold", activeTab === 'ACTIVE' ? "text-blue-600" : "text-gray-500")}>Active ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={clsx("flex-1 py-2 items-center rounded-md", activeTab === 'PAST' ? "bg-white shadow-sm" : "")}
          onPress={() => setActiveTab('PAST')}
        >
          <Text className={clsx("font-bold", activeTab === 'PAST' ? "text-blue-600" : "text-gray-500")}>Past ({pastOrders.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : displayOrders.length > 0 ? (
        <FlatList
          data={displayOrders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">No {activeTab.toLowerCase()} orders found.</Text>
        </View>
      )}
    </View>
  );
}
