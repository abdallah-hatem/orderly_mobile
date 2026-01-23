import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { TouchableOpacity, Text } from 'react-native';
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

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {user ? (
        <>
          <Stack.Screen 
            name="Groups" 
            component={GroupsListScreen} 
            options={({ navigation }: any) => ({
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('History')} className="mr-4">
                  <Text className="text-black font-bold">History</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Order History' }} />
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
                <TouchableOpacity onPress={() => navigation.navigate('Groups')} className="ml-4">
                  <Text className="text-black font-bold text-lg">Back</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen name="PastOrder" component={PastOrderScreen} options={{ title: 'Order Details' }} />
          <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} options={{ title: 'Split Bill' }} />
          <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ title: 'Invite Friend' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        </>
      )}
    </Stack.Navigator>
  );
};
