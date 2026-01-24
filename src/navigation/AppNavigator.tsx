import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { TouchableOpacity, Text } from 'react-native';
import { Users, Clock, User, Plus, Bell } from 'lucide-react-native';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import GroupsListScreen from '../screens/GroupsListScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import RestaurantSelectionScreen from '../screens/RestaurantSelectionScreen';
import MenuScreen from '../screens/MenuScreen';
import OrderSummaryScreen from '../screens/OrderSummaryScreen';
import ReceiptReviewScreen from '../screens/ReceiptReviewScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import HistoryScreen from '../screens/HistoryScreen';
import PastOrderScreen from '../screens/PastOrderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InvitationsScreen from '../screens/InvitationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Groups Stack Navigator
function GroupsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="GroupsList" 
        component={GroupsListScreen} 
        options={({ navigation }: any) => ({
          title: 'My Groups',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('CreateGroup')} 
              style={{ marginRight: 16 }}
            >
              <Plus size={28} color="#000" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'Create Group' }} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} options={{ title: 'Group Orders' }} />
      <Stack.Screen name="RestaurantSelection" component={RestaurantSelectionScreen} options={{ title: 'Select Restaurant' }} />
      <Stack.Screen name="Menu" component={MenuScreen} />
      <Stack.Screen 
        name="OrderSummary" 
        component={OrderSummaryScreen} 
        options={({ navigation }: any) => ({
          title: 'My Order',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('GroupsList')} className="ml-4">
              <Text className="text-black font-bold text-lg">Back</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} options={{ title: 'Split Bill' }} />
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Friend' }} />
    </Stack.Navigator>
  );
}

// History Stack Navigator
function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="HistoryList" component={HistoryScreen} options={{ title: 'Order History' }} />
      <Stack.Screen name="PastOrder" component={PastOrderScreen} options={{ title: 'Order Details' }} />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

// Invitations Stack Navigator
function InvitationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name="InvitationsList" component={InvitationsScreen} options={{ title: 'Invitations' }} />
    </Stack.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          position: 'absolute',
          bottom: 28,
          left: 20,
          right: 20,
          marginHorizontal: 20,
          backgroundColor: '#fff',
          borderRadius: 30,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Groups" 
        component={GroupsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack}
        options={{
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Invitations" 
        component={InvitationsStack}
        options={{
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  usePushNotifications(user);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Create Account' }} />
        </>
      )}
    </Stack.Navigator>
  );
};
