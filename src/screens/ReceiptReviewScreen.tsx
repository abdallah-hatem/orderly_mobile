import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Camera, Receipt as ReceiptIcon, Check, DollarSign, Edit2, Save, ArrowRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import { Receipt, SplitResult } from '../types';

export default function ReceiptReviewScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [split, setSplit] = useState<SplitResult[]>([]);
  
  const [fees, setFees] = useState({ subtotal: '', tax: '', serviceFee: '', deliveryFee: '' });
  const [itemPriceOverrides, setItemPriceOverrides] = useState<{[key: string]: string}>({});
  const [editing, setEditing] = useState(false);

  const [payments, setPayments] = useState<{[key: string]: string}>({});
  const [settlement, setSettlement] = useState<any>(null);

  // When receipt or split changes, initialize state
  useEffect(() => {
    if (receipt) {
        setFees({
            subtotal: (receipt.subtotal || 0).toString(),
            tax: (receipt.tax || 0).toString(),
            serviceFee: (receipt.serviceFee || 0).toString(),
            deliveryFee: (receipt.deliveryFee || 0).toString()
        });
        
        // Load existing individual overrides
        const existingOverrides = receipt.rawParsedData?.individualItemOverrides || {};
        const initialOverrides: {[key: string]: string} = {};
        
        split.forEach(s => {
            s.items?.forEach(item => {
                const val = existingOverrides[item.id] !== undefined ? existingOverrides[item.id] : item.currentPrice;
                initialOverrides[item.id] = (val || 0).toString();
            });
        });
        setItemPriceOverrides(initialOverrides);
    }
  }, [receipt, split]);

  // Recalculate Subtotal when item prices change
  useEffect(() => {
    if (editing && split.length > 0) {
        let total = 0;
        split.forEach(s => {
            s.items?.forEach(item => {
                const priceStr = itemPriceOverrides[item.id];
                const price = priceStr !== undefined ? parseFloat(priceStr) : item.currentPrice;
                total += (price || 0);
            });
        });
        setFees(f => ({ ...f, subtotal: total.toFixed(2) }));
    }
  }, [itemPriceOverrides, split, editing]);

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
        const formattedOverrides: Record<string, number> = {};
        Object.keys(itemPriceOverrides).forEach(id => {
            formattedOverrides[id] = parseFloat(itemPriceOverrides[id]) || 0;
        });

        const { data } = await api.put(`/receipts/${receipt.id}`, {
            subtotal: parseFloat(fees.subtotal) || 0,
            tax: parseFloat(fees.tax) || 0,
            serviceFee: parseFloat(fees.serviceFee) || 0,
            deliveryFee: parseFloat(fees.deliveryFee) || 0,
            individualItemOverrides: formattedOverrides
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
    if (!receipt) return;
    
    const totalPaid = receipt.totalAmount;
    const totalEntered = Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const difference = Math.abs(totalPaid - totalEntered);

    if (difference > 0.01) {
        Alert.alert(
            'Unbalanced Bill',
            `The sum of member payments (${totalEntered.toFixed(2)} EGP) must match the total paid (${totalPaid.toFixed(2)} EGP). Difference: ${difference.toFixed(2)} EGP.`
        );
        return;
    }

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

  const handleManualSplit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/receipts/${orderId}/manual`);
      setReceipt(data.receipt);
      setSplit(data.split);
      // Automatically enter editing mode so user can add tax/fees
      setEditing(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize manual split');
    } finally {
      setLoading(false);
    }
  };

  const getLiveUserTotal = (userSplit: SplitResult) => {
    const userItemTotal = userSplit.items?.reduce((sum, item) => {
      const priceStr = itemPriceOverrides[item.id];
      const price = priceStr !== undefined ? parseFloat(priceStr) : item.currentPrice;
      return sum + (price || 0);
    }, 0) || 0;

    if (!editing) return userSplit.total;

    // Calculate this user's portion of the current live fees
    const currentSubtotal = parseFloat(fees.subtotal) || 0;
    const totalFees = (parseFloat(fees.tax) || 0) + 
                      (parseFloat(fees.serviceFee) || 0) + 
                      (parseFloat(fees.deliveryFee) || 0);
    
    let userSharedPortion = 0;
    if (currentSubtotal > 0) {
      // Proportional split (common strategy)
      userSharedPortion = (userItemTotal / currentSubtotal) * totalFees;
    } else if (split.length > 0) {
      // Equal split if subtotal is 0
      userSharedPortion = totalFees / split.length;
    }

    return userItemTotal + userSharedPortion;
  };

  if (loading) return (
    <View className="flex-1 items-center justify-center bg-white p-10">
      <ActivityIndicator size="large" color="black" />
      <Text className="mt-4 text-center font-bold">Gemini is parsing your receipt...</Text>
      <Text className="text-gray-500 text-center mt-2">Matching items to group members</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      className="flex-1" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View className="flex-1 bg-gray-50">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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
                className="bg-black p-4 rounded-xl flex-row items-center w-full justify-center mb-4"
                onPress={handleUpload}
              >
                <Camera color="white" size={20} className="mr-2" />
                <Text className="text-white font-bold text-lg ml-2">Select Receipt Image</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-white p-4 rounded-xl border border-gray-200 w-full items-center"
                onPress={handleManualSplit}
              >
                <Text className="text-gray-600 font-bold text-lg">Skip & Manual Assign</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="bg-white rounded-2xl p-6 mb-6 shadow-sm">
                  <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-lg font-bold">Receipt Summary</Text>
                      {!editing ? (
                          <TouchableOpacity 
                              onPress={() => setEditing(true)}
                              className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-lg"
                          >
                              <Edit2 size={16} color="black" />
                              <Text className="ml-2 font-bold text-xs">EDIT BILL</Text>
                          </TouchableOpacity>
                      ) : (
                          <TouchableOpacity 
                              onPress={handleUpdateFees}
                              className="flex-row items-center bg-black px-3 py-1.5 rounded-lg"
                          >
                              <Check size={16} color="white" />
                              <Text className="ml-2 font-bold text-xs text-white">SAVE CHANGES</Text>
                          </TouchableOpacity>
                      )}
                  </View>

                  <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-600">Subtotal</Text>
                      {editing ? (
                           <TextInput 
                              className="border border-gray-300 rounded px-2 py-1 w-24 text-right bg-white"
                              value={fees.subtotal}
                              onChangeText={(t) => setFees({...fees, subtotal: t})}
                              keyboardType="numeric"
                          />
                      ) : (
                          <Text className="font-medium">{receipt.subtotal.toFixed(2)} EGP</Text>
                      )}
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
                                  {(
                                      (parseFloat(fees.subtotal) || 0) + 
                                      (parseFloat(fees.tax) || 0) + 
                                      (parseFloat(fees.serviceFee) || 0) + 
                                      (parseFloat(fees.deliveryFee) || 0)
                                  ).toFixed(2)} EGP
                              </Text>
                          </View>
                      </>
                  ) : (
                      <>
                          <View className="flex-row justify-between mb-2">
                              <Text className="text-gray-600">Tax</Text>
                              <Text className="font-medium">{receipt.tax.toFixed(2)} EGP</Text>
                          </View>
                          <View className="flex-row justify-between mb-2">
                              <Text className="text-gray-600">Service Fee</Text>
                              <Text className="font-medium">{receipt.serviceFee.toFixed(2)} EGP</Text>
                          </View>
                          <View className="flex-row justify-between mb-2">
                              <Text className="text-gray-600">Delivery Fee</Text>
                              <Text className="font-medium">{receipt.deliveryFee.toFixed(2)} EGP</Text>
                          </View>
                          <View className="flex-row justify-between pt-3 border-t border-gray-100 mt-2">
                              <Text className="font-bold text-xl">Total Paid</Text>
                              <Text className="font-bold text-xl">{receipt.totalAmount.toFixed(2)} EGP</Text>
                          </View>
                      </>
                  )}
              </View>

              <Text className="text-lg font-bold mb-3 px-1">How much everyone owes</Text>
              {split.length === 0 && (
                  <View className="bg-white rounded-2xl p-6 mb-6 items-center shadow-sm">
                      <Text className="text-gray-400 text-center">No items added to this order yet. Subtotal and fees will be split equally among all members.</Text>
                  </View>
              )}
              {split.map((s, idx) => (
                  <View key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border-l-4 border-black">
                      <View className="flex-row justify-between items-start">
                          <Text className="font-bold text-lg">{s.userName}</Text>
                          <Text className="text-xl font-bold text-black">{getLiveUserTotal(s).toFixed(2)} EGP</Text>
                      </View>
                      
                      <View className="mt-2 pt-2 border-t border-gray-50">
                          {(!s.items || s.items.length === 0) && (
                              <Text className="text-xs text-gray-400 italic">No specific items assigned</Text>
                          )}
                          {s.items?.map((item) => (
                              <View key={item.id} className="flex-row justify-between items-center mb-2">
                                  <Text className="text-sm text-gray-600 flex-1">{item.quantity}x {item.name}</Text>
                                  {editing ? (
                                      <View className="flex-row items-center">
                                          <Text className="text-gray-400 text-xs mr-1">EGP</Text>
                                          <TextInput 
                                               className="border border-gray-200 rounded px-2 h-8 w-24 text-sm bg-white text-black font-medium pb-[4px]"
                                               style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                               value={itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.currentPrice.toString()}
                                               onChangeText={(t) => setItemPriceOverrides({...itemPriceOverrides, [item.id]: t})}
                                               keyboardType="numeric"
                                           />
                                      </View>
                                  ) : (
                                      <Text className="text-sm font-medium">{item.currentPrice.toFixed(2)} EGP</Text>
                                  )}
                              </View>
                          ))}
                          {!editing && (
                               <Text className="text-gray-400 text-[10px] mt-1 italic">+ {s.sharedCostPortion.toFixed(2)} EGP active tax & fees</Text>
                          )}
                      </View>
                  </View>
              ))}

              <Text className="text-lg font-bold mb-3 px-1 mt-6">Who Paid What?</Text>
              {split.map((s, idx) => (
                  <View key={idx} className="bg-white rounded-2xl p-4 mb-2 shadow-sm flex-row items-center justify-between">
                      <Text className="font-bold text-lg">{s.userName}</Text>
                      <View className="flex-row items-center">
                          <Text className="mr-2 text-gray-500">EGP</Text>
                          <TextInput 
                              className="border border-gray-300 rounded px-2 py-2 w-24 text-right bg-gray-50"
                              value={payments[s.userId] || ''}
                              onChangeText={(t) => setPayments({...payments, [s.userId]: t})}
                              keyboardType="numeric"
                              placeholder="0.00"
                          />
                      </View>
                  </View>
              ))}

              <View className={`mt-4 p-4 rounded-xl flex-row justify-between items-center ${
                  Math.abs(receipt.totalAmount - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                  <View>
                      <Text className="text-xs font-bold text-gray-400 uppercase">Balance Status</Text>
                      <Text className={`font-bold ${
                          Math.abs(receipt.totalAmount - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                          {Math.abs(receipt.totalAmount - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                          ? 'Matched perfectly!'
                          : `Mismatch: ${(receipt.totalAmount - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)} EGP`}
                      </Text>
                  </View>
                  <View className="items-end">
                      <Text className="text-xs font-bold text-gray-400 uppercase">Target Total</Text>
                      <Text className="font-bold text-black">{receipt.totalAmount.toFixed(2)} EGP</Text>
                  </View>
              </View>

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
                                      <ArrowRight size={18} color="#6B7280" style={{ marginHorizontal: 8 }}/>
                                      <Text className="text-green-400 font-bold text-lg">{s.to}</Text>
                                  </View>
                                  <Text className="text-white font-bold text-xl">{s.amount.toFixed(2)} EGP</Text>
                              </View>
                          ))
                      )}
                  </View>
              )}

               <TouchableOpacity 
                className={`p-4 rounded-xl items-center mt-2 mb-10 ${!settlement ? 'bg-gray-100' : 'bg-black shadow-lg'}`}
                onPress={() => {
                    if (!settlement) {
                        Alert.alert('First things first', 'Please calculate the settlement plan before finishing.');
                        return;
                    }
                    navigation.navigate('History');
                }}
              >
                <Text className={`font-bold text-lg ${!settlement ? 'text-gray-400' : 'text-white'}`}>Finish & Go Home</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
