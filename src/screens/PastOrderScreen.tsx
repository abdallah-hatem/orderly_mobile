
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { User, Receipt, DollarSign, ArrowRight } from 'lucide-react-native';
import api from '../api/client';
import { Order, OrderItem } from '../types';
import { format } from 'date-fns';

type Settlement = {
  balances: { [userId: string]: number };
  debts: { from: string; to: string; amount: number; fromName: string; toName: string }[];
};

export default function PastOrderScreen({ route }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    try {
      const { data: orderData } = await api.get(`/orders/${orderId}`);
      setOrder(orderData);

      if (['CLOSED', 'PAID'].includes(orderData.status)) {
        try {
            const { data: settlementData } = await api.get(`/orders/${orderId}/payments/settlement`);
            setSettlement(settlementData);
        } catch (err) {
            console.log('No settlement data found or error fetching it', err);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="black" className="mt-10" />;
  if (!order) return <Text className="text-center mt-10">Order not found</Text>;

  const groupedItems = order.items.reduce((acc: any, item: OrderItem) => {
      const userId = item.userId;
      if (!acc[userId]) acc[userId] = { name: item.user.name, items: [] };
      acc[userId].items.push(item);
      return acc;
  }, {});

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Header Info */}
        <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
                <View className="w-16 h-16 bg-gray-100 rounded-lg mr-4 items-center justify-center overflow-hidden">
                     {order.restaurant.imageUrl ? (
                        <Image source={{ uri: order.restaurant.imageUrl }} className="w-full h-full" />
                     ) : (
                        <Text className="text-2xl">🍽️</Text>
                     )}
                </View>
                <View>
                    <Text className="text-xl font-bold">{order.restaurant.name}</Text>
                    <Text className="text-gray-500">{format(new Date(order.createdAt), 'PPP')}</Text>
                    <View className="bg-gray-100 self-start px-2 py-1 rounded-md mt-1">
                        <Text className="text-xs font-bold text-gray-600">{order.status}</Text>
                    </View>
                </View>
            </View>
        </View>

        {/* Items */}
        <Text className="text-lg font-bold mb-3 uppercase text-gray-400 tracking-wider">Items</Text>
        {Object.keys(groupedItems).map((userId) => (
            <View key={userId} className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center mb-3 border-b border-gray-100 pb-2">
                    <User size={16} color="black" className="mr-2" />
                    <Text className="font-bold">{groupedItems[userId].name}</Text>
                </View>

                {groupedItems[userId].items.map((item: OrderItem) => (
                    <View key={item.id} className="flex-row justify-between mb-2">
                        <View className="flex-1">
                            <Text className="text-gray-800">{item.menuItem.name} {item.variant ? `(${item.variant.name})` : ''}</Text>
                            {item.addons.map((a: any, idx: number) => (
                                <Text key={idx} className="text-gray-500 text-xs">+ {a.addon.name}</Text>
                            ))}
                        </View>
                        <Text className="font-medium text-gray-600">${item.priceAtOrder.toFixed(2)}</Text>
                    </View>
                ))}
            </View>
        ))}

        {/* Receipt Summary */}
        {order.receipt && (
            <>
                <Text className="text-lg font-bold mb-3 mt-2 uppercase text-gray-400 tracking-wider">Receipt</Text>
                <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500">Subtotal</Text>
                        <Text>${order.receipt.subtotal?.toFixed(2) || '0.00'}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500">Tax</Text>
                        <Text>${order.receipt.tax.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500">Service Fee</Text>
                        <Text>${order.receipt.serviceFee.toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500">Delivery Fee</Text>
                        <Text>${order.receipt.deliveryFee.toFixed(2)}</Text>
                    </View>
                    <View className="h-[1px] bg-gray-200 my-2" />
                    <View className="flex-row justify-between">
                        <Text className="font-bold text-lg">Total</Text>
                        <Text className="font-bold text-lg">${order.receipt.totalAmount.toFixed(2)}</Text>
                    </View>
                </View>
            </>
        )}

        {/* Payment Information */}
        {order.payments && order.payments.length > 0 && (
            <>
                <Text className="text-lg font-bold mb-3 mt-2 uppercase text-gray-400 tracking-wider">Who Paid</Text>
                <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
                    {order.payments.map((payment: any, idx: number) => (
                        <View key={idx} className="flex-row justify-between mb-2 last:mb-0">
                            <Text className="text-gray-800">{payment.user?.name || 'Unknown'}</Text>
                            <Text className="font-bold text-green-600">${payment.amount.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            </>
        )}

        {/* Settlement/Result */}
        {settlement && settlement?.debts?.length > 0 && (
            <>
                <Text className="text-lg font-bold mb-3 mt-2 uppercase text-gray-400 tracking-wider">Settlement</Text>
                <View className="bg-white p-4 rounded-xl mb-6 shadow-sm">
                    {settlement.debts.map((debt, idx) => (
                        <View key={idx} className="flex-row items-center justify-between mb-3 last:mb-0">
                            <View className="flex-row items-center flex-1">
                                <Text className="font-bold text-gray-800">{debt.fromName}</Text>
                                <ArrowRight size={16} color="#9CA3AF" className="mx-2" />
                                <Text className="font-bold text-gray-800">{debt.toName}</Text>
                            </View>
                            <Text className="font-bold text-green-600">${debt.amount.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            </>
        )}
      </ScrollView>
    </View>
  );
}
