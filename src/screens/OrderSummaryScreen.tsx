import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { User, Receipt as ReceiptIcon, ChevronLeft, Trash2, Edit2 } from 'lucide-react-native';
import api from '../api/client';
import { Order, OrderItem } from '../types';

export default function OrderSummaryScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);



  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder();
  }, []);

  const { user: currentUser } = useAuth();

  const handleCloseOrder = async () => {
      try {
          await api.put(`/orders/${orderId}/close`);
          navigation.navigate('ReceiptReview', { orderId });
      } catch (error) {
          console.error(error);
      }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this group order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.put(`/orders/${orderId}/cancel`);
              navigation.navigate('Groups');
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteItem = (item: OrderItem, ownerName: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.menuItem.name}" for ${ownerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/orders/${orderId}/items/${item.id}`);
              fetchOrder();
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleEditItem = (item: OrderItem, ownerName: string) => {
    Alert.alert(
      'Edit Item',
      `This will remove "${item.menuItem.name}" for ${ownerName} and take you back to the menu. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit', 
          onPress: async () => {
            try {
              await api.delete(`/orders/${orderId}/items/${item.id}`);
              navigation.navigate('Menu', { orderId, restaurantId: order!.restaurantId });
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  if (loading) return <ActivityIndicator size="large" color="black" className="mt-10" />;
  if (!order) return <Text className="text-center mt-10">Order not found</Text>;

  const groupedItems = order.items.reduce((acc: any, item: OrderItem) => {
      const userId = item.userId;
      if (!acc[userId]) acc[userId] = { name: item.user.name, items: [] };
      acc[userId].items.push(item);
      return acc;
  }, {});

  const isInitiator = currentUser?.id === order.initiatorId;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text className="text-2xl font-bold mb-6">Group Order Summary</Text>

        {Object.keys(groupedItems).map((userId) => (
            <View key={userId} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center mb-3">
                    <User size={18} color="black" className="mr-2" />
                    <Text className="font-bold text-lg">{groupedItems[userId].name}</Text>
                </View>

                {groupedItems[userId].items.map((item: OrderItem) => {
                    const ownerName = groupedItems[userId].name;
                    return (
                        <View key={item.id} className="flex-row justify-between mb-4">
                            <View className="flex-1">
                                <Text className="font-medium text-gray-900">{item.menuItem.name} {item.variant ? `(${item.variant.name})` : ''}</Text>
                                {item.addons.map((a: any, idx: number) => (
                                    <Text key={idx} className="text-gray-500 text-xs">+ {a.addon.name}</Text>
                                ))}
                            </View>
                            <View className="flex-row items-center">
                                <Text className="font-bold mr-4 text-gray-900">${item.priceAtOrder.toFixed(2)}</Text>
                                {order.status === 'OPEN' && (
                                    <View className="flex-row">
                                        {/* Only owner can edit their own item */}
                                        {userId === currentUser?.id && (
                                            <TouchableOpacity 
                                              className="p-1.5 bg-gray-50 rounded-lg mr-2"
                                              onPress={() => handleEditItem(item, ownerName)}
                                            >
                                                <Edit2 size={14} color="#6B7280" />
                                            </TouchableOpacity>
                                        )}
                                        
                                        {/* Owner OR Initiator can delete */}
                                        {(userId === currentUser?.id || isInitiator) && (
                                            <TouchableOpacity 
                                              className="p-1.5 bg-red-50 rounded-lg"
                                              onPress={() => handleDeleteItem(item, ownerName)}
                                            >
                                                <Trash2 size={14} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        ))}

        {order.status === 'OPEN' ? (
             <TouchableOpacity 
                className="bg-black p-4 rounded-xl flex-row items-center justify-center mt-4 border-2 border-dashed border-gray-600 bg-white"
                onPress={() => navigation.navigate('Menu', { orderId, restaurantId: order.restaurantId })}
             >
                <Text className="text-black font-bold">Add more items</Text>
             </TouchableOpacity>
        ) : null}

        {order.status === 'OPEN' && isInitiator && (
            <TouchableOpacity 
                className="p-4 rounded-xl flex-row items-center justify-center mt-4 border border-red-100 bg-red-50"
                onPress={handleCancelOrder}
            >
                <Text className="text-red-600 font-bold">Cancel Group Order</Text>
            </TouchableOpacity>
        )}
      </ScrollView>

      {order.status === 'OPEN' && isInitiator && (
           <View className="p-4 bg-white border-t border-gray-100">
               <TouchableOpacity 
                    className="bg-black p-4 rounded-xl items-center"
                    onPress={handleCloseOrder}
               >
                   <Text className="text-white font-bold text-lg">Close Order & Split Bill</Text>
               </TouchableOpacity>
           </View>
      )}
    </View>
  );
}
