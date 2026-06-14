import React from 'react';
import { useNetworkError } from '../hooks/useNetworkError';
import { OfflineBanner } from './OfflineBanner';

export const GlobalOfflineBanner: React.FC = () => {
  const { isConnected } = useNetworkError(null);
  return <OfflineBanner visible={isConnected === false} />;
};
