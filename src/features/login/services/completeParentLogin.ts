import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from '../../../common/constants';
import type { AppDispatch } from '../../../redux/store';
import { registerParentPushToken } from '../../../services/push';
import { useSelectionStore } from '../../../store/selectionStore';
import {
  mapParentMeToUser,
  ParentProfileService,
} from '../../profile/services/ParentProfileService';
import { loginSuccess } from '../slices/authSlice';

type ParentLoginData = {
  accessToken?: string;
  mustResetPassword?: boolean;
  user?: Record<string, unknown>;
};

export async function completeParentLogin(
  dispatch: AppDispatch,
  response: { status: boolean; message?: string; data?: unknown }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!response.status || !response.data || typeof response.data !== 'object') {
    return { ok: false, message: response.message || 'Login failed' };
  }

  const data = response.data as ParentLoginData;
  if (!data.accessToken) {
    return { ok: false, message: response.message || 'Login failed' };
  }

  useSelectionStore.getState().setSelectedStudentId(null);

  const mustResetPassword = Boolean(data.mustResetPassword);
  await AsyncStorage.setItem(localStorageKeys.ACCESS_TOKEN, data.accessToken);
  await AsyncStorage.removeItem(localStorageKeys.LEGACY_ACCESS_TOKEN);
  if (mustResetPassword) {
    await AsyncStorage.setItem(localStorageKeys.MUST_RESET_PASSWORD, 'true');
  } else {
    await AsyncStorage.removeItem(localStorageKeys.MUST_RESET_PASSWORD);
  }

  try {
    const userResponse = await ParentProfileService.getUser();
    if (userResponse?.status && userResponse.data) {
      dispatch(
        loginSuccess({
          ...mapParentMeToUser(userResponse.data as Record<string, unknown>),
          mustResetPassword,
        })
      );
      const clientId = Number(
        (userResponse.data as { clientId?: unknown; schoolId?: unknown }).clientId ??
          (userResponse.data as { schoolId?: unknown }).schoolId ??
          0
      );
      if (clientId > 0) {
        await AsyncStorage.setItem(
          localStorageKeys.PARENT_LAST_SCHOOL_ID,
          String(clientId)
        );
      }
      try {
        await registerParentPushToken(data.accessToken);
      } catch {
        /* push registration is best-effort */
      }
      return { ok: true };
    }
  } catch {
    /* fall through to login payload */
  }

  const mapped = mapParentMeToUser(data.user);
  if (mapped.clientId > 0) {
    await AsyncStorage.setItem(
      localStorageKeys.PARENT_LAST_SCHOOL_ID,
      String(mapped.clientId)
    );
  }
  dispatch(
    loginSuccess({
      ...mapped,
      mustResetPassword,
    })
  );
  return { ok: true };
}
