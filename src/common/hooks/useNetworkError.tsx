import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { isNetworkError } from '../helpers/networkHelper';

interface UseNetworkErrorReturn {
  isNetworkError: boolean;
  isConnected: boolean;
  checkNetworkError: (error: unknown) => boolean;
}

export const useNetworkError = (error?: string | null): UseNetworkErrorReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      const finalConnected =
        state.isInternetReachable === null ? !!state.isConnected : !!connected;
      setIsConnected(finalConnected);
      if (finalConnected && hasNetworkError) {
        setHasNetworkError(false);
      }
    });

    NetInfo.fetch().then((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      const finalConnected =
        state.isInternetReachable === null ? !!state.isConnected : !!connected;
      setIsConnected(finalConnected);
    });

    return () => unsubscribe();
  }, [hasNetworkError]);

  useEffect(() => {
    if (error) {
      const isNetworkRelated = isNetworkError(error);
      setHasNetworkError(isNetworkRelated && !isConnected);
    } else {
      setHasNetworkError(false);
    }
  }, [error, isConnected]);

  const checkNetworkError = useCallback(
    (err: unknown): boolean => {
      const isNetworkRelated = isNetworkError(err);
      const shouldShow = isNetworkRelated && !isConnected;
      setHasNetworkError(shouldShow);
      return shouldShow;
    },
    [isConnected]
  );

  return {
    isNetworkError: hasNetworkError,
    isConnected,
    checkNetworkError,
  };
};
