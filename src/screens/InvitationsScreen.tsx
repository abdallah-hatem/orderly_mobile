import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import api from '../api/client';
import { Group } from '../types';

export default function InvitationsScreen({ navigation }: any) {
  const [receivedInvitations, setReceivedInvitations] = useState<Group[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        api.get('/groups/invitations'),
        api.get('/groups/invitations/sent')
      ]);
      setReceivedInvitations(receivedRes.data);
      setSentInvitations(sentRes.data);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });

    fetchData(); // Initial fetch

    return unsubscribe;
  }, [navigation]);

  const handleInviteResponse = async (groupId: string, accept: boolean) => {
    try {
      await api.put(`/groups/${groupId}/respond`, { accept });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const renderReceivedItem = ({ item }: { item: Group }) => (
    <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>{item.name}</Text>
      <Text style={{ color: '#6b7280', marginBottom: 12 }}>You've been invited to join this group.</Text>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity 
          style={{ backgroundColor: 'black', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginRight: 8 }}
          onPress={() => handleInviteResponse(item.id, true)}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
          onPress={() => handleInviteResponse(item.id, false)}
        >
          <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 12 }}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentItem = ({ item }: { item: any }) => (
    <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.user.name}</Text>
        <Text style={{ color: '#6b7280' }}>Group: {item.group.name}</Text>
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e5e7eb' }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{item.status}</Text>
      </View>
    </View>
  );

  const displayData = activeTab === 'RECEIVED' ? receivedInvitations : sentInvitations;

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
      {/* Tab Switcher */}
      <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4 }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeTab === 'RECEIVED' ? 'white' : 'transparent', borderRadius: 6 }}
          onPress={() => setActiveTab('RECEIVED')}
        >
          <Text style={{ fontWeight: 'bold', color: activeTab === 'RECEIVED' ? '#2563eb' : '#6b7280' }}>Received ({receivedInvitations.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeTab === 'SENT' ? 'white' : 'transparent', borderRadius: 6 }}
          onPress={() => setActiveTab('SENT')}
        >
          <Text style={{ fontWeight: 'bold', color: activeTab === 'SENT' ? '#2563eb' : '#6b7280' }}>Sent ({sentInvitations.length})</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : displayData?.length > 0 ? (
        <FlatList
          data={displayData}
          renderItem={activeTab === 'RECEIVED' ? renderReceivedItem : renderSentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>No {activeTab.toLowerCase()} invitations found.</Text>
        </View>
      )}
    </View>
  );
}