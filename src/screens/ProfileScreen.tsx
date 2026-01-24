import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Mail } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* User Profile Card */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <User size={40} color="white" />
          </View>
          
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 8 }}>
            {user?.name || 'User'}
          </Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Mail size={16} color="#6b7280" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              {user?.email || 'email@example.com'}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Account
          </Text>
          
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
            <Text style={{ fontSize: 16, color: '#111' }}>User ID</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{user?.id || 'N/A'}</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={{ backgroundColor: '#ef4444', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
          onPress={handleLogout}
        >
          <LogOut size={20} color="white" style={{ marginRight: 8 }} />
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#9ca3af' }}>Orderly v1.0.0</Text>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Group Food Ordering Made Easy</Text>
        </View>
      </ScrollView>
    </View>
  );
}
