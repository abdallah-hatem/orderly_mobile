import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import api from '../api/client';
import { Order } from '../types';

export default function HistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  useEffect(() => {
    fetchOrders();
  }, []);

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

  const activeOrders = orders.filter(o => o.status === 'OPEN');
  const pastOrders = orders.filter(o => o.status !== 'OPEN');
  const displayOrders = activeTab === 'ACTIVE' ? activeOrders : pastOrders;

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}
      onPress={() => {
        if (item.status === 'OPEN') {
          navigation.getParent()?.navigate('Groups', {
            screen: 'OrderSummary',
            params: { orderId: item.id }
          });
        } else {
          navigation.navigate('PastOrder', { orderId: item.id });
        }
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.restaurant.name}</Text>
        <Text style={{ color: '#6b7280' }}>{item?.group?.name || 'No group'}</Text>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

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
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No {activeTab.toLowerCase()} orders found.</Text>
        </View>
      )}
    </View>
  );
}
