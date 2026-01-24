import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { ShoppingCart, CheckCircle2 } from 'lucide-react-native';
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

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
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
    
    const cartItem = {
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      addons: selectedAddons.map(a => ({ addonId: a.id, name: a.name, price: a.price })),
      quantity: 1,
      price: selectedItem.basePrice + (selectedVariant?.priceDiff || 0) + selectedAddons.reduce((s, a) => s + a.price, 0)
    };

    setCart([...cart, cartItem]);
    setSelectedItem(null);
    setSelectedVariant(null);
    setSelectedAddons([]);
  };

  const handleSubmitItems = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${orderId}/items`, { 
        items: cart.map(item => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            quantity: item.quantity,
            addons: item.addons.map((a: any) => ({ addonId: a.addonId }))
        }))
      });
      navigation.navigate('OrderSummary', { orderId });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" color="black" className="mt-10" />;
  if (!restaurant) return <Text className="text-center mt-10">Menu not found</Text>;

  const sections = restaurant.categories.map(cat => ({
    title: cat.name,
    data: cat.items
  }));

  return (
    <View className="flex-1 bg-white">
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
              <Text className="text-black font-bold mt-2">${item.basePrice.toFixed(2)}</Text>
            </View>
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="bg-gray-50 px-4 py-2 font-bold text-gray-500">{title}</Text>
        )}
      />

      {cart.length > 0 && (
        <View className="bg-transparent border-t border-gray-100 mb-[105px] min-w-[250px] w-[90%] mx-auto">
          <TouchableOpacity 
            className="bg-black p-4 rounded-3xl flex-row justify-between items-center shadow-lg"
            onPress={handleSubmitItems}
            disabled={submitting}
          >
            <View className="flex-row items-center">
                <ShoppingCart size={20} color="white" className="mr-2" />
                <Text className="text-white font-bold">{cart.length} items selected</Text>
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
