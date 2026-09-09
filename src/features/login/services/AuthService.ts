import type { IApiResponse } from '../../../common/interfaces';
import { localStorageKeys } from '../../../common/constants';
import { authApiService } from '../../../common/services/authClient';
import { isFirebaseLoginEnabled } from '../../../../config/firebaseLogin';
import { getFirebaseAuth } from '../../../native/firebaseAuthSafe';
import { api } from '../../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const auth = getFirebaseAuth();
const apiService = authApiService;

/** Marker verificationId when using backend Redis/SMS OTP (Firebase disabled). */
export const BACKEND_OTP_VERIFICATION_ID = 'backend-sms';

export type FirebasePhoneLoginResult = {
  verificationId: string;
  prefilledOtp?: string;
  phoneAuthMethodHint?: 'instant';
};

type AutoOtpPayload = { code: string; mobile: string };

let autoOtpSubscribers: Array<(p: AutoOtpPayload) => void> = [];

export function subscribeFirebasePhoneAutoOtp(
  fn: (p: AutoOtpPayload) => void
): () => void {
  autoOtpSubscribers.push(fn);
  return () => {
    autoOtpSubscribers = autoOtpSubscribers.filter((x) => x !== fn);
  };
}

function notifyFirebasePhoneAutoOtp(payload: AutoOtpPayload) {
  autoOtpSubscribers.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore */
    }
  });
}

export function firebasePhoneMatchesIndiaLocal(
  firebasePhone: string | null | undefined,
  tenDigitLocal: string
): boolean {
  if (!firebasePhone || !tenDigitLocal) {
    return false;
  }
  const fbDigits = firebasePhone.replace(/\D/g, '');
  const localDigits = tenDigitLocal.replace(/\D/g, '');
  if (localDigits.length !== 10) {
    return false;
  }
  return fbDigits.endsWith(localDigits);
}

export class AuthService {
  public static async firebaseLoginWithMobile(
    mobile: string,
    forceResend = false
  ): Promise<FirebasePhoneLoginResult> {
    if (!isFirebaseLoginEnabled()) {
      await AuthService.requestOtp(mobile);
      return { verificationId: BACKEND_OTP_VERIFICATION_ID };
    }

    const phone = `+91${mobile}`;
    const listener = auth().verifyPhoneNumber(phone, 60, forceResend);

    return new Promise<FirebasePhoneLoginResult>((resolve, reject) => {
      let settled = false;
      const finish = (result: FirebasePhoneLoginResult) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      listener.on(
        'state_changed',
        async (snapshot) => {
          if (snapshot.state === 'error') {
            if (!settled && snapshot.error) {
              settled = true;
              reject(snapshot.error);
            }
            return;
          }

          if (snapshot.state === 'verified' && snapshot.code) {
            try {
              const credential = auth.PhoneAuthProvider.credential(
                snapshot.verificationId,
                snapshot.code
              );
              await auth().signInWithCredential(credential);
            } catch (e: unknown) {
              if (!settled) {
                settled = true;
                reject(new Error(e instanceof Error ? e.message : String(e)));
              }
              return;
            }
            notifyFirebasePhoneAutoOtp({
              code: snapshot.code,
              mobile,
            });
            if (!settled) {
              finish({
                verificationId: snapshot.verificationId,
                prefilledOtp: snapshot.code,
                phoneAuthMethodHint: 'instant',
              });
            }
            return;
          }

          if (snapshot.state === 'sent') {
            finish({ verificationId: snapshot.verificationId });
            return;
          }

          if (snapshot.state === 'timeout') {
            if (!settled) {
              finish({ verificationId: snapshot.verificationId });
            }
          }
        },
        (err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        },
        (successSnapshot) => {
          if (!settled && successSnapshot.state === 'sent') {
            finish({ verificationId: successSnapshot.verificationId });
          }
        }
      );
    });
  }

  public static async firebaseVerifyOtp(verificationId: string, code: string) {
    if (!isFirebaseLoginEnabled()) {
      return { status: true, message: 'Using backend SMS OTP' };
    }
    const trimmedId = verificationId?.trim?.() ?? '';
    const trimmedCode = code?.trim?.() ?? '';
    if (!trimmedId || !trimmedCode) {
      throw new Error('Missing verification session or code.');
    }
    try {
      const credential = auth.PhoneAuthProvider.credential(trimmedId, trimmedCode);
      await auth().signInWithCredential(credential);
      return { status: true, message: 'Phone authentication successful!' };
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  public static async firebaseSignOut(): Promise<void> {
    if (!isFirebaseLoginEnabled()) return;
    try {
      await auth().signOut();
    } catch {
      /* ignore */
    }
  }

  public static async clearLocalSession(): Promise<void> {
    await AuthService.firebaseSignOut();
    await AsyncStorage.multiRemove([
      localStorageKeys.ACCESS_TOKEN,
      localStorageKeys.LEGACY_ACCESS_TOKEN,
      localStorageKeys.MUST_RESET_PASSWORD,
    ]);
  }

  public static async passwordLogin(
    mobile: string,
    password: string,
    schoolId: number
  ): Promise<IApiResponse> {
    try {
      return await apiService.post<IApiResponse>(
        '/clients/authentication/parent/password-login',
        { mobile, password, schoolId }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Login failed: ${msg}`);
    }
  }

  public static async listSchoolsForMobile(mobile: string): Promise<IApiResponse> {
    try {
      return await apiService.post<IApiResponse>(
        '/clients/authentication/parent/schools',
        { mobile }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not load schools: ${msg}`);
    }
  }

  public static async requestForgotPasswordOtp(mobile: string): Promise<IApiResponse> {
    try {
      return await apiService.post<IApiResponse>(
        '/clients/authentication/parent/forgot-password',
        { mobile }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`send otp failed: ${msg}`);
    }
  }

  public static async resetPasswordWithOtp(params: {
    mobile: string;
    otp: string;
    newPassword: string;
  }): Promise<IApiResponse> {
    try {
      return await apiService.post<IApiResponse>(
        '/clients/authentication/parent/reset-password',
        {
          mobile: params.mobile,
          otp: params.otp,
          newPassword: params.newPassword,
        }
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`reset password failed: ${msg}`);
    }
  }

  public static async changePassword(
    newPassword: string,
    currentPassword?: string
  ): Promise<IApiResponse> {
    try {
      const { data } = await api.put<IApiResponse>('/clients/parent/me/password', {
        newPassword,
        currentPassword: currentPassword || undefined,
      });
      return data;
    } catch (error: unknown) {
      const ax = error as { response?: { data?: IApiResponse } };
      if (ax?.response?.data) {
        return ax.response.data;
      }
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`change password failed: ${msg}`);
    }
  }

  /** Backend SMS OTP (used when Firebase is disabled / Expo Go). */
  public static async requestOtp(mobile: string): Promise<IApiResponse> {
    const data = { mobile };
    try {
      const response = await apiService.post<IApiResponse>(
        '/clients/authentication/parent/request-otp',
        data
      );
      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`send otp failed: ${msg}`);
    }
  }

  /**
   * Parent portal: either Redis OTP or Firebase ID token (same contract as gentrack institute flow,
   * but path is `/clients/authentication/parent/verify-otp`).
   */
  public static async verifyOtp(params: {
    mobile: string;
    otp?: string;
    firebaseIdToken?: string;
  }): Promise<IApiResponse> {
    const { mobile, otp, firebaseIdToken } = params;
    const data =
      firebaseIdToken != null && firebaseIdToken !== ''
        ? { mobile, firebaseIdToken }
        : { mobile, otp };
    try {
      const response: IApiResponse = await apiService.post(
        '/clients/authentication/parent/verify-otp',
        data
      );
      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`verify otp failed: ${msg}`);
    }
  }
}
