import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { PropsWithChildren, useEffect } from 'react';

import { queryClient } from '@/src/lib/queryClient';
import { storagePersister } from '@/src/lib/storagePersister';

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: storagePersister,
        maxAge: 24 * 60 * 60 * 1000,
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
