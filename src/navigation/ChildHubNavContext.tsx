import React, { createContext, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import { navigateToTab } from './navigationRef';

const ChildHubRestoreContext = createContext<(() => boolean) | null>(null);

export function ChildHubRestoreProvider({
  restore,
  children,
}: {
  restore: () => boolean;
  children: React.ReactNode;
}) {
  return (
    <ChildHubRestoreContext.Provider value={restore}>
      {children}
    </ChildHubRestoreContext.Provider>
  );
}

export function useChildHubRestore(): (() => boolean) | null {
  return useContext(ChildHubRestoreContext);
}

/** Back to notifications (or the previous hub section) when possible. */
export function useHubAwareBack(): () => void {
  const restore = useChildHubRestore();
  const navigation = useNavigation();

  return () => {
    if (restore?.()) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToTab({ tab: 'Home' });
  };
}
