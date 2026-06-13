import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, AppTheme } from '../../theme';
import { localStorageKeys } from '../constants';

const ThemeContext = createContext<{
  theme: AppTheme;
  toggleTheme: () => void;
  isDark: boolean;
}>({
  theme: lightTheme,
  toggleTheme: () => {},
  isDark: false,
});

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<AppTheme>(lightTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(localStorageKeys.DARK_MODE_ENABLED);
        if (stored === 'true') setTheme(darkTheme);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === lightTheme ? darkTheme : lightTheme;
      void AsyncStorage.setItem(localStorageKeys.DARK_MODE_ENABLED, String(next === darkTheme));
      return next;
    });
  };

  if (!ready) {
    return (
      <ThemeContext.Provider value={{ theme: lightTheme, toggleTheme: () => {}, isDark: false }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === darkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
