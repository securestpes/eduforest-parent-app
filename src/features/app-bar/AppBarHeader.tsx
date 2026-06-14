import { View, Image, StyleSheet } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { AppTheme } from '../../theme';
import { useAppLanguage, useAppTheme, useNetworkError } from '../../common';
import { RootState } from '@/redux/store';

export function AppBarHeader() {
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();
  const styles = createStyles(theme);

  const user = useSelector((s: RootState) => s.auth.user);
  const { isConnected } = useNetworkError(null);

  const handleNotificationPress = () => {
    // Alert.alert(t('common.comingSoon'), t('common.notificationsSoon'));
  };

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTop,
          { backgroundColor: theme.colors.primaryContainer, opacity: 0.65 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: theme.colors.secondaryContainer, opacity: 0.4 },
        ]}
      />
      <View style={styles.foreground}>
        <Appbar.Header
          style={styles.header}
          elevated={false}
          statusBarHeight={isConnected === false ? 0 : undefined}
        >
          <Image
            source={require('../../assets/logo-strip.png')}
            style={styles.avatar}
            resizeMode="cover"
          />
          <Text style={{ flex: 1 }}>{''}</Text>
          <Appbar.Action
            icon={'bell-ring-outline'}
            onPress={handleNotificationPress}
          />
        </Appbar.Header>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { width: '100%' },
    foreground: {
      overflow: 'hidden',
      borderBottomColor: theme.colors.outlineVariant,
      borderBottomWidth: 1,
    },
    orb: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
    },
    orbTop: { top: -120, right: -80 },
    orbBottom: { bottom: -100, left: -100 },
    header: {
      paddingHorizontal: 10,
      backgroundColor: 'transparent',
    },
    avatar: {
      width: 150,
      height: 70,
      marginRight: theme.margin.md,
    },
  });
