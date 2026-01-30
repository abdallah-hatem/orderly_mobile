import { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/client';
import { navigate, forceNavigate } from '../navigation/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push notification permission NOT granted. Status:', finalStatus, 'Existing Status:', existingStatus);
      return;
    }

    // Learn more about projectId:
    // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      if (!projectId) {
        console.log('Project ID not found. Notifications will not work. Run `eas init` to configure.');
        // Return early to avoid the error
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync({
        projectId,
      })).data;
      console.log('Expo Push Token:', token);
    } catch (e: any) {
      console.error('Error fetching push token:', e.message);
    }
  } else {
    // alert('Must use physical device for Push Notifications');
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export const usePushNotifications = (user: any) => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined
  );
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (token) {
        // Send token to backend
        api.put('/users/me/push-token', { token })
          .then(() => console.log('Push token updated on backend'))
          .catch(err => console.error('Failed to update push token', err));
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      
      // Auto-navigate when notification is received (not just tapped)
      const data = notification.request.content.data;
      console.log('[Notification Received] Type:', data?.type, 'OrderId:', data?.orderId);
      
      if ((data?.type === 'ORDER_SPLIT' || data?.type === 'ORDER_FINALIZED') && data?.orderId) {
        console.log(`[Notification Received] Auto-navigating to order (${data.type}):`, data.orderId);
        setTimeout(() => {
          forceNavigate('OrderSummary', { orderId: data.orderId });
        }, 500);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification Data:', data);

      if (data?.type === 'ORDER_SPLIT' || data?.type === 'ORDER_FINALIZED') {
        // Navigate directly to the order
        console.log(`[Notification Tapped] Navigating to order (${data.type}):`, data.orderId);
        setTimeout(() => {
          if (data.orderId) {
            forceNavigate('OrderSummary', { orderId: data.orderId });
          } else {
            navigate('History', { screen: 'HistoryList' });
          }
        }, 500);
      } else if (data?.groupId) {
        // Navigate to GroupDetails
        // Use a timeout or check ref state to ensure navigation is ready
        setTimeout(() => {
          // We navigate to 'Main' -> 'Groups' stack -> 'GroupDetails'
          // Or if we use the top level navigator names:
          if (data.type === 'GROUP_INVITATION') {
            navigate('Invitations', { screen: 'InvitationsList' });
          } else if (data.type === 'NEW_ORDER' && data.orderId) {
            navigate('OrderSummary', { orderId: data.orderId, groupId: data.groupId });
          } else {
            navigate('GroupDetails', { groupId: data.groupId });
          }
        }, 500);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return {
    expoPushToken,
    notification,
  };
};
