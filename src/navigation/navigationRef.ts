import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

export function forceNavigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    if (name === 'OrderSummary') {
      // First, ensure we are on the History tab with the root list
      navigationRef.navigate('Main', {
        screen: 'History',
        params: {
          screen: 'HistoryList',
        }
      });
      
      // Then, push the specific OrderSummary on top of the list after a tiny delay
      // This makes it feel like a natural navigation from the list
      setTimeout(() => {
        navigationRef.navigate('Main', {
          screen: 'History',
          params: {
            screen: 'OrderSummary',
            params: { ...params, _forceKey: Date.now() },
          }
        });
      }, 100);
    } else {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: name,
          params: { ...params, _forceKey: Date.now() },
        })
      );
    }
  }
}
