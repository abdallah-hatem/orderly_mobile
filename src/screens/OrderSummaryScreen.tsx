import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { format } from 'date-fns';
import api from '../api/client';
import { Order, OrderItem, Receipt, SplitResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { User, ChevronLeft, Trash2, Edit2, Utensils, ArrowRight } from 'lucide-react-native';

export default function OrderSummaryScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [settlement, setSettlement] = useState<any>(null);



  const fetchOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);

      if (data.status !== 'OPEN') {
          // Fetch receipt and settlement info
          try {
              const [receiptRes, settlementRes] = await Promise.all([
                  api.get(`/receipts/order/${orderId}`),
                  api.get(`/orders/${orderId}/payments/settlement`)
              ]);
              setReceipt(receiptRes.data);
              setSettlement(settlementRes.data);
          } catch (err) {
              console.warn('Failed to fetch settlement data', err);
          }
      }
    } catch (error) {
      console.error(error);
      navigation.navigate('GroupsList');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrder();
    });

    fetchOrder();
    return unsubscribe;
  }, [navigation, orderId, route.params]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder();
  }, [orderId]);

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
              navigation.navigate('GroupsList');
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
      `Are you sure you want to remove "${item.menuItem?.name || item.customItemName || 'this item'}" for ${ownerName}?`,
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
              navigation.navigate('GroupsList');
            }
          }
        }
      ]
    );
  };

  const handleEditItem = (item: OrderItem, ownerName: string) => {
    Alert.alert(
      'Edit Item',
      `This will remove "${item.menuItem?.name || item.customItemName || 'this item'}" for ${ownerName} and take you back to the menu. Continue?`,
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
              navigation.navigate('GroupsList');
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
      if (!acc[userId]) {
          const userSettlement = settlement?.overall?.find((s: any) => s.userId === userId);
          acc[userId] = { 
              name: item.user.name, 
              items: [],
              total: userSettlement?.total || item.priceAtOrder, // Fallback if no settlement yet
              sharedCostPortion: userSettlement?.sharedCostPortion || 0
          };
      }
      acc[userId].items.push(item);
      return acc;
  }, {});

  // Recalculate totals if settlement is active but groupedItems was built before it loaded
  if (settlement?.overall) {
      settlement.overall.forEach((s: any) => {
          if (groupedItems[s.userId]) {
              groupedItems[s.userId].total = s.total;
              groupedItems[s.userId].sharedCostPortion = s.sharedCostPortion;
          }
      });
  }

  const isInitiator = currentUser?.id === order.initiatorId;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
            <View className="flex-row items-center">
                <View className="w-16 h-16 bg-gray-100 rounded-lg mr-4 items-center justify-center overflow-hidden">
                     {order.restaurant?.imageUrl ? (
                        <Image source={{ uri: order.restaurant.imageUrl }} className="w-full h-full" />
                     ) : (
                        <View className="items-center justify-center">
                            <Text className="text-2xl">🍽️</Text>
                        </View>
                     )}
                </View>
                <View>
                    <Text className="text-xl font-bold">{order.restaurant?.name || order.customRestaurantName || 'Custom Restaurant'}</Text>
                    <Text className="text-gray-500">{format(new Date(order.createdAt), 'PPP')}</Text>
                    <View className="bg-gray-100 self-start px-2 py-0.5 rounded-md mt-1">
                        <Text className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{order.status}</Text>
                    </View>
                </View>
            </View>
        </View>

        <Text className="text-lg font-bold mb-3 uppercase text-gray-400 tracking-wider px-1">Order Summary</Text>

        {Object.keys(groupedItems).map((userId) => (
            <View key={userId} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                        <User size={18} color="black" className="mr-2" />
                        <Text className="font-bold text-lg">{groupedItems[userId].name}</Text>
                    </View>
                    <Text className="font-bold text-lg text-black">{(groupedItems[userId].total || 0).toFixed(2)} EGP</Text>
                </View>

                {groupedItems[userId].items.map((item: OrderItem) => {
                    const ownerName = groupedItems[userId].name;
                    return (
                        <View key={item.id} className="flex-row justify-between mb-4">
                            <View className="flex-1">
                                <Text className="font-medium text-gray-900">
                                    {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.menuItem?.name || item.customItemName || 'Unnamed Item'} {item.variant ? `(${item.variant.name})` : ''}
                                </Text>
                                {item.addons.map((a: any, idx: number) => (
                                    <Text key={idx} className="text-gray-500 text-xs">+ {a.addon.name}</Text>
                                ))}
                            </View>
                            <View className="flex-row items-center">
                                <Text className="font-bold mr-4 text-gray-900">{((item.priceAtOrder || 0) * item.quantity).toFixed(2)} EGP</Text>
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

                {groupedItems[userId].sharedCostPortion > 0 && (
                    <View className="mt-2 pt-2 border-t border-gray-50 flex-row justify-between">
                        <Text className="text-gray-400 text-xs italic">+ Shared tax & fees</Text>
                        <Text className="text-gray-400 text-xs italic">{(groupedItems[userId].sharedCostPortion || 0).toFixed(2)} EGP</Text>
                    </View>
                )}
            </View>
        ))}

        {receipt && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
                <Text className="text-lg font-bold mb-4">Shared Costs & Fees</Text>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Subtotal</Text>
                    <Text className="font-medium">{(receipt.subtotal || 0).toFixed(2)} EGP</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Tax</Text>
                    <Text className="font-medium">{(receipt.tax || 0).toFixed(2)} EGP</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Service Fee</Text>
                    <Text className="font-medium">{(receipt.serviceFee || 0).toFixed(2)} EGP</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Delivery Fee</Text>
                    <Text className="font-medium">{(receipt.deliveryFee || 0).toFixed(2)} EGP</Text>
                </View>
                <View className="flex-row justify-between pt-3 border-t border-gray-100 mt-2">
                    <Text className="font-bold text-xl">Total Paid</Text>
                    <Text className="font-bold text-xl">{(receipt.totalAmount || 0).toFixed(2)} EGP</Text>
                </View>
            </View>
        )}

        {order.payments && order.payments.length > 0 && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm border-l-4 border-green-500">
                <Text className="text-lg font-bold mb-4">Who Paid What?</Text>
                {order.payments.map((payment: any, idx: number) => (
                    <View key={idx} className="flex-row justify-between mb-2">
                        <Text className="text-gray-800">{payment.user?.name || 'Unknown'}</Text>
                        <Text className="font-bold text-green-600">{(payment.amount || 0).toFixed(2)} EGP</Text>
                    </View>
                ))}
            </View>
        )}

        {settlement && settlement.settlements && settlement.settlements.length > 0 && (
            <View className="bg-black rounded-2xl p-6 mb-6">
                <Text className="text-white text-xl font-bold mb-4 text-center">Settlement Plan</Text>
                {settlement.settlements.map((s: any, idx: number) => (
                    <View key={idx} className="flex-row items-center justify-between mb-4 border-b border-gray-800 pb-2">
                        <View className="flex-row items-center flex-1">
                            <Text className="text-red-400 font-bold text-lg">{s.from}</Text>
                            <ArrowRight size={18} color="#6B7280" style={{ marginHorizontal: 8 }} />
                            <Text className="text-green-400 font-bold text-lg">{s.to}</Text>
                        </View>
                        <Text className="text-white font-bold text-xl ml-2">{(s.amount || 0).toFixed(2)} EGP</Text>
                    </View>
                ))}
            </View>
        )}

        {settlement && settlement.settlements && settlement.settlements.length === 0 && order.status !== 'OPEN' && (
             <View className="bg-green-50 border border-green-100 rounded-2xl p-6 mb-6 items-center">
                <Text className="text-green-800 font-bold text-lg text-center">All set! No pending payments.</Text>
             </View>
        )}

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

      {(order.status === 'OPEN' || order.status === 'SPLITTING') && isInitiator && (
           <View className="bg-transparent border-t border-gray-100 mb-[105px] min-w-[250px] w-[70%] mx-auto">
               <TouchableOpacity 
                    className="bg-black p-4 rounded-3xl items-center"
                    onPress={handleCloseOrder}
               >
                   <Text className="text-white font-bold text-lg">
                     {order.status === 'OPEN' ? 'Close Order & Split Bill' : 'Continue Splitting'}
                   </Text>
               </TouchableOpacity>
           </View>
      )}
    </View>
  );
}
