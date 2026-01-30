import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert } from 'react-native';
import api from '../api/client';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';

export default function HistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });

    fetchOrders(); // Initial fetch

    return unsubscribe;
  }, [navigation]);

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

  const activeStatuses = ['OPEN', 'SPLITTING'];
  const pastStatuses = ['CLOSED', 'CANCELLED', 'PAID'];
  
  const activeOrders = orders.filter((o: any) => activeStatuses.includes(o.status));
  const pastOrders = orders.filter((o: any) => pastStatuses.includes(o.status));
  const displayOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  const handleCloseOrder = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/close`);
      navigation.navigate('ReceiptReview', { orderId });
    } catch (error) {
      console.error('Failed to close order:', error);
      Alert.alert('Error', 'Failed to close the order. Please try again.');
    }
  };

  const renderItem = ({ item }: { item: Order }) => {
    const isInitiator = user?.id === item.initiatorId;
    const canClose = (item.status === 'OPEN' || item.status === 'SPLITTING') && isInitiator;

    return (
      <TouchableOpacity
        style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}
        onPress={() => {
          navigation.navigate('OrderSummary', { orderId: item.id });
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                {item.restaurant?.name || item.customRestaurantName || 'Custom Restaurant'}
            </Text>
            <Text style={{ color: '#6b7280' }}>{item?.group?.name || 'No group'}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: item.status === 'OPEN' ? '#dcfce7' : (item.status === 'SPLITTING' ? '#fef9c3' : '#e5e7eb'), marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.status === 'OPEN' ? '#166534' : (item.status === 'SPLITTING' ? '#854d0e' : '#6b7280') }}>{item.status}</Text>
            </View>
            {canClose && (
              <TouchableOpacity 
                onPress={() => handleCloseOrder(item.id)}
                style={{ backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                  {item.status === 'OPEN' ? 'Close & Split' : 'Continue Splitting'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
      <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4 }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeTab === 'ACTIVE' ? 'white' : 'transparent', borderRadius: 6 }}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={{ fontWeight: 'bold', color: activeTab === 'ACTIVE' ? '#2563eb' : '#6b7280' }}>Active ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeTab === 'PAST' ? 'white' : 'transparent', borderRadius: 6 }}
          onPress={() => setActiveTab('PAST')}
        >
          <Text style={{ fontWeight: 'bold', color: activeTab === 'PAST' ? '#2563eb' : '#6b7280' }}>Past ({pastOrders.length})</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : displayOrders?.length > 0 ? (
        <FlatList
          data={displayOrders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No {activeTab.toLowerCase()} orders found.</Text>
        </View>
      )}
    </View>
  );
}
