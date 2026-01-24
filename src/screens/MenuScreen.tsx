import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { ShoppingCart, CheckCircle2, Plus, Minus } from 'lucide-react-native';
import api from '../api/client';
import { Restaurant, MenuItem, MenuItemVariant, MenuItemAddon } from '../types';

export default function MenuScreen({ route, navigation }: any) {
  const { orderId, restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    if (!restaurantId) {
        setLoading(false);
        return;
    }
    try {
      const { data } = await api.get(`/restaurants/${restaurantId}`);
      setRestaurant(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!selectedItem) return;
    const price = selectedItem.basePrice + (selectedVariant?.priceDiff || 0) + selectedAddons.reduce((s, a) => s + a.price, 0);

    const existingIndex = cart.findIndex(item => 
        item.menuItemId === selectedItem.id && 
        item.variantId === selectedVariant?.id &&
        JSON.stringify(item.addons) === JSON.stringify(selectedAddons.map(a => ({ addonId: a.id, name: a.name, price: a.price }))) &&
        item.price === price
    );

    if (existingIndex > -1) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += 1;
        setCart(newCart);
    } else {
        const cartItem = {
          menuItemId: selectedItem.id,
          name: selectedItem.name,
          variantId: selectedVariant?.id,
          variantName: selectedVariant?.name,
          addons: selectedAddons.map(a => ({ addonId: a.id, name: a.name, price: a.price })),
          quantity: 1,
          price
        };
        setCart([...cart, cartItem]);
    }

    setSelectedItem(null);
    setSelectedVariant(null);
    setSelectedAddons([]);
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const addManualToCart = () => {
    if (!manualName.trim()) return;
    
    const price = parseFloat(manualPrice) || 0;
    const quantity = manualQuantity;
    const name = manualName.trim();

    const existingIndex = cart.findIndex(item => 
        item.menuItemId === null && 
        item.customItemName === name && 
        item.price === price
    );

    if (existingIndex > -1) {
        const newCart = [...cart];
        newCart[existingIndex].quantity += quantity;
        setCart(newCart);
    } else {
        const cartItem = {
          menuItemId: null,
          customItemName: name,
          name: name,
          quantity: quantity,
          price: price
        };
        setCart([...cart, cartItem]);
    }

    setManualName('');
    setManualPrice('');
    setManualQuantity(1);
    triggerSuccess();
  };

  const handleSubmitItems = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${orderId}/items`, { 
        items: cart.map(item => ({
            menuItemId: item.menuItemId,
            customItemName: item.customItemName,
            priceAtOrder: item.price,
            quantity: item.quantity,
            addons: item.addons?.map((a: any) => ({ addonId: a.addonId })) || []
        }))
      });
      navigation.navigate('OrderSummary', { orderId });
    } catch (error) {
      console.error(error);
      navigation.navigate('GroupsList');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="black" className="mt-10" />;
  const sections = restaurant?.categories.map(cat => ({
    title: cat.name,
    data: cat.items
  })) || [];

  return (
    <View className="flex-1 bg-white">
      {showSuccess && (
          <View className="absolute top-10 left-0 right-0 z-50 items-center">
              <View className="bg-green-600 px-6 py-3 rounded-full flex-row items-center shadow-lg">
                  <CheckCircle2 size={18} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold">Added to Selection!</Text>
              </View>
          </View>
      )}
      {restaurant ? (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="p-4 border-b border-gray-50 flex-row justify-between items-center"
                onPress={() => setSelectedItem(item)}
              >
                <View className="flex-1">
                  <Text className="text-lg font-semibold">{item.name}</Text>
                  {item.description && <Text className="text-gray-500 text-sm mt-1">{item.description}</Text>}
                  <Text className="text-black font-bold mt-2">{item.basePrice.toFixed(2)} EGP</Text>
                </View>
              </TouchableOpacity>
            )}
            renderSectionHeader={({ section: { title } }) => (
              <Text className="bg-gray-50 px-4 py-2 font-bold text-gray-500">{title}</Text>
            )}
          />
      ) : (
          <ScrollView className="p-6">
              <View className="bg-gray-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 items-center mb-8">
                  <Text className="text-xl font-bold mb-2">Manual Order Mode</Text>
                  <Text className="text-gray-500 text-center">This restaurant has no menu. Just type what you want to order below.</Text>
              </View>

              <View className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <Text className="font-bold text-gray-400 uppercase tracking-widest text-[10px] mb-4">Item Details</Text>
                  
                  <View className="mb-4">
                      <Text className="text-sm font-bold text-gray-700 mb-2">What do you want?</Text>
                      <TextInput 
                          className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                          placeholder="e.g. Large Pepperoni Pizza"
                          value={manualName}
                          onChangeText={setManualName}
                      />
                  </View>

                  <View className="flex-row mb-6">
                      <View className="flex-1 mr-2">
                          <Text className="text-sm font-bold text-gray-700 mb-2">Price (Optional)</Text>
                          <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3">
                              <Text className="text-gray-400 font-bold mr-1">EGP</Text>
                              <TextInput 
                                  className="flex-1 py-3"
                                  placeholder="0.00"
                                  keyboardType="numeric"
                                  value={manualPrice}
                                  onChangeText={setManualPrice}
                              />
                          </View>
                      </View>
                      <View className="ml-2">
                          <Text className="text-sm font-bold text-gray-700 mb-2">Quantity</Text>
                          <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
                              <TouchableOpacity 
                                  className="w-10 h-10 items-center justify-center bg-white rounded-lg shadow-sm"
                                  onPress={() => setManualQuantity(Math.max(1, manualQuantity - 1))}
                              >
                                  <Minus size={16} color="black" />
                              </TouchableOpacity>
                              
                              <Text className="px-4 font-bold text-lg">{manualQuantity}</Text>
                              
                              <TouchableOpacity 
                                  className="w-10 h-10 items-center justify-center bg-white rounded-lg shadow-sm"
                                  onPress={() => setManualQuantity(manualQuantity + 1)}
                              >
                                  <Plus size={16} color="black" />
                              </TouchableOpacity>
                          </View>
                      </View>
                  </View>

                  <TouchableOpacity 
                      className={`p-4 rounded-xl items-center ${!manualName.trim() ? 'bg-gray-100' : 'bg-black'}`}
                      disabled={!manualName.trim()}
                      onPress={addManualToCart}
                  >
                      <Text className={`font-bold ${!manualName.trim() ? 'text-gray-400' : 'text-white'}`}>Add to My Selection</Text>
                  </TouchableOpacity>
              </View>

              {cart.length > 0 && (
                  <View className="mt-8 pb-10">
                      <Text className="font-bold text-lg mb-4">Your current items:</Text>
                      {cart.map((item, idx) => (
                          <View key={idx} className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl mb-2">
                              <View>
                                  <Text className="font-bold">{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</Text>
                                  <Text className="text-gray-400 text-xs">{item.price > 0 ? `${item.price.toFixed(2)} EGP` : 'Free'}</Text>
                              </View>
                              <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== idx))}>
                                  <Text className="text-red-500 font-bold">Remove</Text>
                              </TouchableOpacity>
                          </View>
                      ))}
                  </View>
              )}
          </ScrollView>
      )}

      {cart.length > 0 && (
        <View className="bg-transparent border-t border-gray-100 mb-[105px] min-w-[250px] w-[90%] mx-auto">
          <TouchableOpacity 
            className="bg-black p-4 rounded-3xl flex-row justify-between items-center shadow-lg"
            onPress={handleSubmitItems}
            disabled={submitting}
          >
            <View className="flex-row items-center">
                <ShoppingCart size={20} color="white" className="mr-2" />
                <Text className="text-white font-bold ml-2">{cart.length} items selected</Text>
            </View>
            <Text className="text-white font-bold text-lg">
                View Summary
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Item Details Modal */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-2xl font-bold">{selectedItem?.name}</Text>
                <TouchableOpacity onPress={() => setSelectedItem(null)}>
                  <Text className="text-gray-500 text-lg">Close</Text>
                </TouchableOpacity>
              </View>
              
              <Text className="text-gray-600 mb-6">{selectedItem?.description}</Text>

              {selectedItem?.variants && selectedItem.variants.length > 0 && (
                <View className="mb-6">
                  <Text className="font-bold text-lg mb-3">Choose Variant</Text>
                  {selectedItem.variants.map(v => (
                    <TouchableOpacity 
                      key={v.id} 
                      className={`flex-row justify-between p-4 border rounded-xl mb-2 ${selectedVariant?.id === v.id ? 'border-black bg-gray-50' : 'border-gray-100'}`}
                      onPress={() => setSelectedVariant(v)}
                    >
                      <Text className="font-medium">{v.name}</Text>
                      <Text className="text-gray-500">+{v.priceDiff.toFixed(2)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedItem?.addons && selectedItem.addons.length > 0 && (
                <View className="mb-6">
                  <Text className="font-bold text-lg mb-3">Addons</Text>
                  {selectedItem.addons.map(a => {
                    const isSelected = selectedAddons.some(sa => sa.id === a.id);
                    return (
                        <TouchableOpacity 
                        key={a.id} 
                        className={`flex-row justify-between p-4 border rounded-xl mb-2 ${isSelected ? 'border-black bg-gray-50' : 'border-gray-100'}`}
                        onPress={() => {
                            if (isSelected) {
                                setSelectedAddons(selectedAddons.filter(sa => sa.id !== a.id));
                            } else {
                                setSelectedAddons([...selectedAddons, a]);
                            }
                        }}
                        >
                        <View className="flex-row items-center">
                            {isSelected && <CheckCircle2 size={18} color="black" className="mr-2" />}
                            <Text className="font-medium">{a.name}</Text>
                        </View>
                        <Text className="text-gray-500">+${a.price.toFixed(2)}</Text>
                        </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              className="bg-black p-4 rounded-xl items-center mt-4"
              onPress={addToCart}
            >
              <Text className="text-white font-bold text-lg">Add to selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
