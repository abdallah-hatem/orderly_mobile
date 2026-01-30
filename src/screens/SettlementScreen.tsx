import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowRight, Check } from 'lucide-react-native';
import api from '../api/client';

export default function SettlementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { settlement, orderId } = route.params || {};
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Order ID missing');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/orders/${orderId}/finalize`);
      navigation.navigate('History');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to finalize order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold mb-6 text-center">Settlement Plan</Text>

        {!settlement || settlement.settlements.length === 0 ? (
          <View className="bg-green-50 p-8 rounded-2xl border border-green-100 items-center mb-8">
            <Check size={48} color="#15803d" />
            <Text className="text-green-800 text-xl font-bold mt-4 text-center">All settled up!</Text>
            <Text className="text-green-600 text-center mt-2">No one owes anything.</Text>
          </View>
        ) : (
          <View>
             {settlement.settlements.map((s: any, i: number) => (
                <View key={i} className="bg-white p-5 rounded-xl mb-3 flex-row items-center border border-gray-100 shadow-sm">
                  <View className="flex-1">
                    <Text className="font-bold text-lg text-gray-800">{s.from}</Text>
                    <Text className="text-xs text-gray-400 font-medium uppercase">Pays</Text>
                  </View>
                  
                  <View className="items-center px-3">
                    <ArrowRight size={24} color="#E5E7EB" />
                  </View>

                  <View className="flex-1 items-end">
                      <Text className="font-bold text-xl text-black">{s.amount.toFixed(2)} EGP</Text>
                      <Text className="text-xs text-gray-500">to {s.to}</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        <TouchableOpacity
          className="bg-black p-4 rounded-xl items-center mt-6"
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Finish & Go Home</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
