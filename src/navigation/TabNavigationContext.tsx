import React, { createContext, useCallback, useContext, useMemo } from 'react';

export type MainTabName = 'Home' | 'Attendance' | 'Study' | 'Fees' | 'More' | 'Profile';

const TAB_TO_INDEX: Record<MainTabName, number> = {
  Home: 0,
  Attendance: 1,
  Study: 2,
  Fees: 3,
  More: 4,
  Profile: 4,
};

const INDEX_TO_TAB: MainTabName[] = ['Home', 'Attendance', 'Study', 'Fees', 'More'];

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
      setIndex(TAB_TO_INDEX[tab] ?? 0);
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

  return (
    <TabNavigationContext.Provider value={value}>{children}</TabNavigationContext.Provider>
  );
}

export function useMainTabNavigation(): TabNavigationContextValue {
  const ctx = useContext(TabNavigationContext);
  if (!ctx) {
    throw new Error('useMainTabNavigation must be used within TabNavigationProvider');
  }
  return ctx;
}
