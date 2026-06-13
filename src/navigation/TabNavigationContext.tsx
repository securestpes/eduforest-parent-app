import React, { createContext, useCallback, useContext, useMemo } from 'react';

export type MainTabName = 'Home' | 'Schedule' | 'Profile';

const TAB_TO_INDEX: Record<MainTabName, number> = {
  Home: 0,
  Schedule: 1,
  Profile: 2,
};

const INDEX_TO_TAB: MainTabName[] = ['Home', 'Schedule', 'Profile'];

type TabNavigationContextValue = {
  index: number;
  setIndex: (index: number) => void;
  navigateToTab: (tab: MainTabName) => void;
  activeTab: MainTabName;
};

const TabNavigationContext = createContext<TabNavigationContextValue | null>(null);

export function TabNavigationProvider({
  children,
  index,
  setIndex,
}: {
  children: React.ReactNode;
  index: number;
  setIndex: (index: number) => void;
}) {
  const navigateToTab = useCallback(
    (tab: MainTabName) => {
      setIndex(TAB_TO_INDEX[tab]);
    },
    [setIndex]
  );

  const value = useMemo(
    () => ({
      index,
      setIndex,
      navigateToTab,
      activeTab: INDEX_TO_TAB[index] ?? 'Home',
    }),
    [index, setIndex, navigateToTab]
  );

  return <TabNavigationContext.Provider value={value}>{children}</TabNavigationContext.Provider>;
}

export function useMainTabNavigation(): TabNavigationContextValue {
  const ctx = useContext(TabNavigationContext);
  if (!ctx) {
    throw new Error('useMainTabNavigation must be used within TabNavigationProvider');
  }
  return ctx;
}
