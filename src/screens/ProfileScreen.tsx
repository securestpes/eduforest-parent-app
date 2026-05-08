import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Switch, Text, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getMe } from '../services/parent';
import { logout } from '../../features/login/slices/authSlice';
import { AuthService } from '../../features/login/services/AuthService';
import { localStorageKeys } from '../../common/constants';
import type { RootState } from '../../redux/store';
import { ScreenDecor } from '../components/ScreenDecor';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import type { AppTheme } from '../../theme';

export function ProfileScreen() {
  const theme = useTheme() as AppTheme;
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const [displayName, setDisplayName] = useState('');
  const [mobile, setMobile] = useState('');
  const [voiceAnnouncementsEnabled, setVoiceAnnouncementsEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await getMe();
          const savedVoiceToggle = await AsyncStorage.getItem(
            localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED
          );
          if (!cancelled && savedVoiceToggle !== null) {
            setVoiceAnnouncementsEnabled(savedVoiceToggle === 'true');
          }
          if (cancelled) return;
          if (res.status && res.data && typeof res.data === 'object') {
            const d = res.data as { mobile?: string; firstName?: string };
            setDisplayName(d.firstName ?? user?.name ?? 'Parent');
            setMobile(d.mobile ?? user?.mobile ?? '');
          }
        } catch {
          if (!cancelled) {
            setDisplayName(user?.name ?? 'Parent');
            setMobile(user?.mobile ?? '');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.name, user?.mobile])
  );

  const onLogout = async () => {
    await AuthService.firebaseSignOut();
    await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
    await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
    dispatch(logout());
  };

  const onToggleVoiceAnnouncements = async (value: boolean) => {
    setVoiceAnnouncementsEnabled(value);
    await AsyncStorage.setItem(
      localStorageKeys.VOICE_ANNOUNCEMENTS_ENABLED,
      String(value)
    );
  };

  const nameForAvatar = displayName || user?.name || 'Parent';
  const hue = avatarHue(nameForAvatar);
  const avatarBg = `hsl(${hue} 42% 42%)`;

  return (
    <ScreenDecor>
      <ScrollView
        contentContainerStyle={styles.root}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.avatarLetters}>{initials(nameForAvatar)}</Text>
          </View>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 12 }}>
            {displayName || user?.name || 'Parent'}
          </Text>
          <View style={[styles.mobileRow, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="cellphone" size={18} color={theme.colors.primary} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginLeft: 8, fontWeight: '600' }}>
              {mobile || user?.mobile || '—'}
            </Text>
          </View>
        </View>

        <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700', marginTop: 8 }}>
          Notifications
        </Text>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons name="bell-ring-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Attendance alerts
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
              When your institute marks attendance and sends a notification, you will get a push alert on this device
              (after you allow notifications).
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <MaterialCommunityIcons name="volume-high" size={24} color={theme.colors.tertiary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Voice announcements
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
              Speak the attendance message when a new alert arrives.
            </Text>
          </View>
          <Switch
            value={voiceAnnouncementsEnabled}
            onValueChange={(value) => void onToggleVoiceAnnouncements(value)}
          />
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <View style={[styles.infoIcon, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Signed in securely
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 20 }}>
              Your session is tied to this phone number. Log out on shared devices when you are done.
            </Text>
          </View>
        </View>

        <Button
          mode="outlined"
          onPress={() => void onLogout()}
          style={[styles.logout, { borderColor: theme.colors.error }]}
          labelStyle={{ color: theme.colors.error, fontWeight: '700' }}
          textColor={theme.colors.error}
          icon="logout"
        >
          Log out
        </Button>
      </ScrollView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  heroCard: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetters: { color: '#fff', fontSize: 32, fontWeight: '800' },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logout: { marginTop: 28, borderRadius: 14 },
});
