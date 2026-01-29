import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { Camera, Receipt as ReceiptIcon, Check, DollarSign, Edit2, Save, ArrowRight, Plus as PlusIcon, Trash2, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import { Receipt, SplitResult } from '../types';

import { navigate } from '../navigation/navigationRef';

export default function ReceiptReviewScreen(props: any) {
  // const navigation = useNavigation<any>();
  // const route = useRoute<any>();
  const { route } = props;
  const navigation = props.navigation; // Fallback to props
  
  console.log('[ReceiptReviewScreen] Rendering with props.');
  
  // Safe access to params
  const orderId = route?.params?.orderId;
  if (!orderId) {
    console.error('[ReceiptReviewScreen] Missing orderId in route params!', route);
  } else {
    // console.log('[ReceiptReviewScreen] Order ID:', orderId);
  }
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [split, setSplit] = useState<SplitResult[]>([]);

  const [fees, setFees] = useState({ total: '', tax: '', serviceFee: '', deliveryFee: '', subtotal: '' });
  const [itemPriceOverrides, setItemPriceOverrides] = useState<{ [key: string]: string }>({});
  const [editing, setEditing] = useState(false);

  const [payments, setPayments] = useState<{ [key: string]: string }>({});
  const [settlement, setSettlement] = useState<any>(null);

  // Manual item state
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [sourceUnassignedIndex, setSourceUnassignedIndex] = useState<number | null>(null);

  // When receipt or split changes, initialize state
  useEffect(() => {
    if (receipt) {
      setFees({
        total: (receipt.totalAmount || 0).toString(),
        tax: (receipt.tax || 0).toString(),
        serviceFee: (receipt.serviceFee || 0).toString(),
        deliveryFee: (receipt.deliveryFee || 0).toString(),
        subtotal: (receipt.subtotal || 0).toString()
      });

      // Load existing individual overrides
      const existingOverrides = receipt.rawParsedData?.individualItemOverrides || {};
      const initialOverrides: { [key: string]: string } = {};

      split.forEach(s => {
        s.items?.forEach(item => {
          const val = existingOverrides[item.id] !== undefined ? existingOverrides[item.id] : item.currentPrice;
          initialOverrides[item.id] = (val || 0).toString();
        });
      });
      setItemPriceOverrides(initialOverrides);
    }
  }, [receipt, split]);

  // Recalculate Total/Subtotal when item prices change
  useEffect(() => {
    if (editing && split.length > 0) {
      let itemsSum = 0;
      split.forEach(s => {
        s.items?.forEach(item => {
          const priceStr = itemPriceOverrides[item.id];
          const price = priceStr !== undefined ? parseFloat(priceStr) : item.currentPrice;
          itemsSum += (price || 0);
        });
      });

      const currentTax = parseFloat(fees.tax) || 0;
      const currentService = parseFloat(fees.serviceFee) || 0;
      const currentDelivery = parseFloat(fees.deliveryFee) || 0;

      const newTotal = itemsSum + currentTax + currentService + currentDelivery;
      setFees(f => ({ ...f, subtotal: itemsSum.toFixed(2), total: newTotal.toFixed(2) }));
    }
  }, [itemPriceOverrides, split, editing]);

  // Handle manual Total/Fee changes to update Subtotal
  const handleBillingChange = (field: string, value: string) => {
    const newFees = { ...fees, [field]: value };

    const total = parseFloat(newFees.total) || 0;
    const tax = parseFloat(newFees.tax) || 0;
    const service = parseFloat(newFees.serviceFee) || 0;
    const delivery = parseFloat(newFees.deliveryFee) || 0;

    const subtotal = total - (tax + service + delivery);
    setFees({ ...newFees, subtotal: subtotal.toFixed(2) });
  };

  const processImage = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      setLoading(true);
      try {
        const asset = result.assets[0];
        // Create data URI
        const imageUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

        const { data } = await api.post(`/receipts/${orderId}`, { imageUrl });
        setReceipt(data.receipt);
        setSplit(data.split);
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to process receipt. Please try again or skip to manual assign.';
        Alert.alert('Parsing Error', message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'We need camera permissions to snap the receipt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    await processImage(result);
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    await processImage(result);
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
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualItem = async () => {
    if (!receipt || !targetUserId || !newItem.name || !newItem.price) return;

    setLoading(true);
    try {
      const currentManualItems = receipt.rawParsedData?.manualExtraItems || [];
      const updatedManualItems = [
        ...currentManualItems,
        {
          name: newItem.name,
          price: parseFloat(newItem.price),
          userId: targetUserId,
          userName: split.find(u => u.userId === targetUserId)?.userName
        }
      ];

      const { data } = await api.put(`/receipts/${receipt.id}`, {
        manualExtraItems: updatedManualItems
      });

      setReceipt(data.receipt);
      setSplit(data.split);
      setShowAddModal(false);
      setNewItem({ name: '', price: '' });
      setSourceUnassignedIndex(null);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add manual item');
    } finally {
      setLoading(false);
    }
  };
  const handleRemoveManualItem = async (index: number) => {
    if (!receipt) return;

    setLoading(true);
    try {
      const currentManualItems = [...(receipt.rawParsedData?.manualExtraItems || [])];
      currentManualItems.splice(index, 1);

      const { data } = await api.put(`/receipts/${receipt.id}`, {
        manualExtraItems: currentManualItems
      });

      setReceipt(data.receipt);
      setSplit(data.split);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove item');
    } finally {
      setLoading(false);
    }
  };

  const itemsTotalSum = split.reduce((acc, s) => acc + (s.items?.reduce((sum, item) => {
    const p = itemPriceOverrides[item.id];
    const price = p !== undefined ? parseFloat(p) : item.currentPrice;
    return sum + (price || 0);
  }, 0) || 0), 0);

  const liveTotal = editing ? (parseFloat(fees.total) || 0) : (receipt?.totalAmount || 0);

  const handleCalculateSettlement = async () => {
    if (!receipt) return;

    const totalPaid = liveTotal;
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
      console.log('[Debug] Settlement Data Received:', data);
      setLoading(false); // Stop loading before navigating
      navigation.navigate('Settlement', { settlement: data });
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.response?.data?.message || 'Failed to calculate settlement');
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
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to initialize manual split');
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

    const targetTotal = parseFloat(fees.total) || 0;
    
    if (itemsTotalSum > 0) {
      // Proportional split of the ENTIRE total (items + fees) based on item proportions
      return (userItemTotal / itemsTotalSum) * targetTotal;
    } else if (split.length > 0) {
      // Equal split of the entire total if no items are present
      return targetTotal / split.length;
    }

    return 0;
  };

  if (loading && !receipt) return (
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
                onPress={handleCamera}
              >
                <Camera color="white" size={20} className="mr-2" />
                <Text className="text-white font-bold text-lg ml-2">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-white border border-gray-200 p-4 rounded-xl flex-row items-center w-full justify-center mb-4"
                onPress={handleGallery}
              >
                <ReceiptIcon color="black" size={20} className="mr-2" />
                <Text className="text-black font-bold text-lg ml-2">Select from Gallery</Text>
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

                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-gray-600 font-bold">TOTAL PAID</Text>
                  {editing ? (
                    <TextInput
                      className="border-2 border-black rounded-xl px-3 py-2 w-32 text-right bg-gray-50 font-bold text-lg"
                      value={fees.total}
                      onChangeText={(t) => handleBillingChange('total', t)}
                      keyboardType="numeric"
                    />
                  ) : (
                    <Text className="font-bold text-xl">{receipt.totalAmount.toFixed(2)} EGP</Text>
                  )}
                </View>

                <View className="border-t border-gray-100 pt-4 mb-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-600">Tax</Text>
                    {editing ? (
                      <TextInput
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                        value={fees.tax}
                        onChangeText={(t) => handleBillingChange('tax', t)}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    ) : (
                      <Text className="font-medium">{receipt.tax.toFixed(2)} EGP</Text>
                    )}
                  </View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-600">Service Fee</Text>
                    {editing ? (
                      <TextInput
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                        value={fees.serviceFee}
                        onChangeText={(t) => handleBillingChange('serviceFee', t)}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    ) : (
                      <Text className="font-medium">{receipt.serviceFee.toFixed(2)} EGP</Text>
                    )}
                  </View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-gray-600">Delivery Fee</Text>
                    {editing ? (
                      <TextInput
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-right"
                        value={fees.deliveryFee}
                        onChangeText={(t) => handleBillingChange('deliveryFee', t)}
                        keyboardType="numeric"
                        placeholder="0.00"
                      />
                    ) : (
                      <Text className="font-medium">{receipt.deliveryFee.toFixed(2)} EGP</Text>
                    )}
                  </View>
                </View>

                <View className="flex-row justify-between pt-3 border-t border-gray-100 mt-2">
                  <View>
                    <Text className="text-gray-400 font-medium">Calculated Subtotal</Text>
                    {editing && (
                      <Text className={`text-[10px] font-bold ${
                        Math.abs((parseFloat(fees.subtotal) || 0) - itemsTotalSum) < 0.01 
                        ? 'text-green-500' 
                        : 'text-orange-500'
                      }`}>
                        {Math.abs((parseFloat(fees.subtotal) || 0) - itemsTotalSum) < 0.01 
                        ? 'Matches items sum' 
                        : 'Mismatch with items sum'}
                      </Text>
                    )}
                  </View>
                  <Text className="font-bold text-gray-500">
                    {editing ? fees.subtotal : receipt.subtotal.toFixed(2)} EGP
                  </Text>
                </View>
              </View>

              {/* UNASSIGNED ITEMS FROM SCAN */}
              {receipt.rawParsedData?.items?.filter((gi: any) => gi.matchedName === null).length > 0 && (
                <View className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-6">
                  <View className="flex-row items-center mb-4">
                    <ReceiptIcon size={20} color="#3B82F6" />
                    <Text className="ml-2 text-blue-800 font-bold text-lg">Unassigned Items from bill</Text>
                  </View>
                  <Text className="text-blue-600 text-xs mb-4">
                    We found these items on your receipt but they weren't in your original order. Assign them to a member:
                  </Text>

                  {receipt.rawParsedData.items
                    .map((gi: any, idx: number) => ({ ...gi, index: idx }))
                    .filter((gi: any) => gi.matchedName === null)
                    .map((gi: any) => (
                      <View key={gi.index} className="flex-row justify-between items-center bg-white/80 p-3 rounded-xl mb-2">
                        <View className="flex-1">
                          <Text className="font-bold text-gray-800">{gi.quantity}x {gi.originalReceiptName || gi.name}</Text>
                          <Text className="text-gray-500 font-medium">{gi.totalPrice.toFixed(2)} EGP</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setNewItem({ name: gi.originalReceiptName || gi.name, price: gi.totalPrice.toString() });
                            setSourceUnassignedIndex(gi.index);
                            setShowAddModal(true);
                          }}
                          className="bg-blue-600 px-3 py-2 rounded-lg"
                        >
                          <Text className="text-white font-bold text-xs">ASSIGN</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  }
                </View>
              )}

              <Text className="text-lg font-bold mb-3 px-1">How much everyone owes</Text>
              {split.length === 0 && (
                <View className="bg-white rounded-2xl p-6 mb-6 items-center shadow-sm">
                  <Text className="text-gray-400 text-center">No items added to this order yet. Subtotal and fees will be split equally among all members.</Text>
                </View>
              )}
              {split.map((s, idx) => (
                <View key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border-l-4 border-black">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="font-bold text-lg">{s.userName}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setTargetUserId(s.userId);
                          setShowAddModal(true);
                        }}
                        className="mt-1 flex-row items-center"
                      >
                        <PlusIcon size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-xs font-bold ml-1">ADD EXTRA ITEM</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-xl font-bold text-black">{getLiveUserTotal(s).toFixed(2)} EGP</Text>
                  </View>

                  <View className="mt-2 pt-2 border-t border-gray-50">
                    {(!s.items || s.items.length === 0) && (
                      <Text className="text-xs text-gray-400 italic">No specific items assigned</Text>
                    )}
                    {s.items?.map((item) => {
                      const isManual = (item as any).isManual;
                      return (
                        <View key={item.id} className="flex-row justify-between items-center mb-2">
                          <Text className="text-sm text-gray-600 flex-1">
                            {item.quantity}x {item.name}
                            {isManual && <Text className="text-[10px] text-blue-500 font-bold"> (NEW)</Text>}
                          </Text>
                          <View className="flex-row items-center">
                            {editing ? (
                              <View className="flex-row items-center">
                                <Text className="text-gray-400 text-xs mr-1">EGP</Text>
                                <TextInput
                                  className="border border-gray-200 rounded px-2 h-8 w-24 text-sm bg-white text-black font-medium pb-[4px]"
                                  style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
                                  value={itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.currentPrice.toString()}
                                  onChangeText={(t) => setItemPriceOverrides({ ...itemPriceOverrides, [item.id]: t })}
                                  keyboardType="numeric"
                                />
                              </View>
                            ) : (
                              <Text className="text-sm font-medium">{item.currentPrice.toFixed(2)} EGP</Text>
                            )}

                            {isManual && (
                              <TouchableOpacity
                                onPress={() => {
                                  const manualIdx = receipt.rawParsedData?.manualExtraItems?.findIndex((m: any) => m.name === item.name && m.userId === s.userId);
                                  if (manualIdx !== -1) handleRemoveManualItem(manualIdx);
                                }}
                                className="ml-2"
                              >
                                <Trash2 size={14} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
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
                      onChangeText={(t) => setPayments({ ...payments, [s.userId]: t })}
                      keyboardType="numeric"
                      placeholder="0.00"
                    />
                  </View>
                </View>
              ))}

              <View className={`mt-4 p-4 rounded-xl flex-row justify-between items-center ${Math.abs(liveTotal - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
                }`}>
                <View>
                  <Text className="text-xs font-bold text-gray-400 uppercase">Balance Status</Text>
                  <Text className={`font-bold ${Math.abs(liveTotal - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                    ? 'text-green-700'
                    : 'text-red-700'
                    }`}>
                    {Math.abs(liveTotal - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)) < 0.01
                      ? 'Matched perfectly!'
                      : `Mismatch: ${(liveTotal - Object.values(payments).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)).toFixed(2)} EGP`}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-bold text-gray-400 uppercase">Target Total</Text>
                  <Text className="font-bold text-black">{liveTotal.toFixed(2)} EGP</Text>
                </View>
              </View>

              <TouchableOpacity
                className="bg-green-600 p-4 rounded-xl items-center mt-4 mb-6"
                onPress={handleCalculateSettlement}
              >
                <Text className="text-white font-bold text-lg">Calculate Settlement</Text>
              </TouchableOpacity>

                  {settlement && (
                    <View className="mt-4 mb-6"><Text>Hidden</Text></View>
                  )}
            
                </>
          )}
        </ScrollView>
      </View>

      {/* Manual Item Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Add Extra Item</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="black" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 mb-2 font-medium">Item Name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 mb-4 text-lg bg-gray-50"
              placeholder="e.g., Shawerma Lahma"
              value={newItem.name}
              onChangeText={(t) => setNewItem({ ...newItem, name: t })}
            />

            <Text className="text-gray-500 mb-2 font-medium">Price (EGP)</Text>
            <TextInput
              className="border border-gray-200 rounded-xl p-4 mb-6 text-lg bg-gray-50"
              placeholder="0.00"
              keyboardType="numeric"
              value={newItem.price}
              onChangeText={(t) => setNewItem({ ...newItem, price: t })}
            />

            <TouchableOpacity
              className="bg-black p-4 rounded-xl items-center"
              onPress={handleAddManualItem}
            >
              <Text className="text-white font-bold text-lg">Add to Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && receipt && (
        <View className="absolute inset-0 bg-white/60 items-center justify-center">
          <ActivityIndicator size="large" color="black" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
