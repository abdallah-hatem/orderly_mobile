import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, TextInput } from 'react-native';
import { Camera, Receipt as ReceiptIcon, Check, DollarSign, Edit2, Save } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import { Receipt, SplitResult } from '../types';

export default function ReceiptReviewScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [split, setSplit] = useState<SplitResult[]>([]);
  
  const [fees, setFees] = useState({ subtotal: '', tax: '', serviceFee: '', deliveryFee: '' });
  const [editing, setEditing] = useState(false);

  const [payments, setPayments] = useState<{[key: string]: string}>({});
  const [settlement, setSettlement] = useState<any>(null);

  // ... useEffect ...

  const handleUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
        const asset = result.assets[0];
        // Create data URI
        const imageUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        
        const { data } = await api.post(`/receipts/${orderId}`, { imageUrl });
        setReceipt(data.receipt);
        setSplit(data.split);
        setFees({
          subtotal: data.receipt.subtotal.toString(),
          tax: data.receipt.tax.toString(),
          serviceFee: data.receipt.serviceFee.toString(),
          deliveryFee: data.receipt.deliveryFee.toString()
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to process receipt');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateFees = async () => {
    if (!receipt) return;
    setLoading(true);
    try {
        const { data } = await api.put(`/receipts/${receipt.id}`, {
            subtotal: parseFloat(fees.subtotal) || 0,
            tax: parseFloat(fees.tax) || 0,
            serviceFee: parseFloat(fees.serviceFee) || 0,
            deliveryFee: parseFloat(fees.deliveryFee) || 0
        });
        setReceipt(data.receipt);
        setSplit(data.split);
        setEditing(false);
    } catch (error) {
        Alert.alert('Error', 'Failed to update receipt');
    } finally {
        setLoading(false);
    }
  };

  const handleCalculateSettlement = async () => {
    setLoading(true);
    try {
        const paymentList = Object.keys(payments).map(userId => ({
            userId,
            amount: parseFloat(payments[userId]) || 0
        }));
        
        await api.post(`/orders/${orderId}/payments`, { payments: paymentList });
        const { data } = await api.get(`/orders/${orderId}/payments/settlement`);
        setSettlement(data);
    } catch (error) {
        Alert.alert('Error', 'Failed to calculate settlement');
    } finally {
        setLoading(false);
    }
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center bg-white p-10">
      <ActivityIndicator size="large" color="black" />
      <Text className="mt-4 text-center font-bold">Gemini is parsing your receipt...</Text>
      <Text className="text-gray-500 text-center mt-2">Matching items to group members</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!receipt ? (
          <View className="mt-10 items-center">
            <View className="bg-gray-100 p-8 rounded-full mb-6">
                <ReceiptIcon size={64} color="gray" />
            </View>
            <Text className="text-xl font-bold mb-2">Upload the receipt</Text>
            <Text className="text-gray-500 text-center mb-8 px-10">
              Snap a photo of the final bill to automatically split tax and fees among the group.
            </Text>
            <TouchableOpacity 
              className="bg-black p-4 rounded-xl flex-row items-center w-full justify-center"
              onPress={handleUpload}
            >
              <Camera color="white" size={20} className="mr-2" />
              <Text className="text-white font-bold text-lg ml-2">Select Receipt Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-bold">Receipt Summary</Text>
                    {!editing ? (
                        <TouchableOpacity onPress={() => setEditing(true)}>
                            <Edit2 size={20} color="black" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleUpdateFees}>
                            <Save size={20} color="black" />
                        </TouchableOpacity>
                    )}
                </View>

                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">Subtotal</Text>
                    <Text className="font-medium">${receipt.subtotal.toFixed(2)}</Text>
                </View>

                {editing ? (
                    <>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600">Tax</Text>
                            <TextInput 
                                className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                                value={fees.tax}
                                onChangeText={(t) => setFees({...fees, tax: t})}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600">Service Fee</Text>
                            <TextInput 
                                className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                                value={fees.serviceFee}
                                onChangeText={(t) => setFees({...fees, serviceFee: t})}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600">Delivery Fee</Text>
                            <TextInput 
                                className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                                value={fees.deliveryFee}
                                onChangeText={(t) => setFees({...fees, deliveryFee: t})}
                                keyboardType="numeric"
                                placeholder="0.00"
                            />
                        </View>
                        <View className="flex-row justify-between pt-3 border-t border-gray-100 mt-2">
                            <Text className="font-bold text-xl">New Total</Text>
                            <Text className="font-bold text-xl">
                                ${(
                                    (parseFloat(fees.subtotal) || 0) + 
                                    (parseFloat(fees.tax) || 0) + 
                                    (parseFloat(fees.serviceFee) || 0) + 
                                    (parseFloat(fees.deliveryFee) || 0)
                                ).toFixed(2)}
                            </Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-600">Tax</Text>
                            <Text className="font-medium">${receipt.tax.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-600">Service Fee</Text>
                            <Text className="font-medium">${receipt.serviceFee.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-600">Delivery Fee</Text>
                            <Text className="font-medium">${receipt.deliveryFee.toFixed(2)}</Text>
                        </View>
                        <View className="flex-row justify-between pt-3 border-t border-gray-100 mt-2">
                            <Text className="font-bold text-xl">Total Paid</Text>
                            <Text className="font-bold text-xl">${receipt.totalAmount.toFixed(2)}</Text>
                        </View>
                    </>
                )}
            </View>

            <Text className="text-lg font-bold mb-3 px-1">How much everyone owes</Text>
            {split.map((s, idx) => (
                <View key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm flex-row items-center justify-between border-l-4 border-black">
                    <View>
                        <Text className="font-bold text-lg">{s.userName}</Text>
                        <Text className="text-gray-500 text-xs">Items: ${s.itemsTotal.toFixed(2)} + Fees: ${s.sharedCostPortion.toFixed(2)}</Text>
                    </View>
                    <Text className="text-xl font-bold text-black">${s.total.toFixed(2)}</Text>
                </View>
            ))}

            <Text className="text-lg font-bold mb-3 px-1 mt-6">Who Paid What?</Text>
            {split.map((s, idx) => (
                <View key={idx} className="bg-white rounded-2xl p-4 mb-2 shadow-sm flex-row items-center justify-between">
                    <Text className="font-bold text-lg">{s.userName}</Text>
                    <View className="flex-row items-center">
                        <Text className="mr-2 text-gray-500">$</Text>
                        <TextInput 
                            className="border border-gray-300 rounded px-2 py-2 w-24 text-right bg-gray-50"
                            value={payments[s.userId]}
                            onChangeText={(t) => setPayments({...payments, [s.userId]: t})}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                </View>
            ))}

            <TouchableOpacity 
              className="bg-green-600 p-4 rounded-xl items-center mt-4 mb-6"
              onPress={handleCalculateSettlement}
            >
              <Text className="text-white font-bold text-lg">Calculate Settlement</Text>
            </TouchableOpacity>

            {settlement && (
                <View className="bg-black rounded-2xl p-6 mb-6">
                    <Text className="text-white text-xl font-bold mb-4 text-center">Settlement Plan</Text>
                    {settlement.settlements.length === 0 ? (
                        <Text className="text-white text-center">All settled! No one owes anything.</Text>
                    ) : (
                        settlement.settlements.map((s: any, idx: number) => (
                            <View key={idx} className="flex-row items-center justify-between mb-4 border-b border-gray-800 pb-2">
                                <View className="flex-row items-center">
                                    <Text className="text-red-400 font-bold text-lg">{s.from}</Text>
                                    <Text className="text-gray-400 mx-2">pays</Text>
                                    <Text className="text-green-400 font-bold text-lg">{s.to}</Text>
                                </View>
                                <Text className="text-white font-bold text-xl">${s.amount.toFixed(2)}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}

            <TouchableOpacity 
              className="bg-gray-200 p-4 rounded-xl items-center mt-2 mb-10"
              onPress={() => navigation.navigate('Groups')}
            >
              <Text className="text-gray-900 font-bold text-lg">Finish & Go Home</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
