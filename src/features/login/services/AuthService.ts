import type { IApiResponse } from '../../../common/interfaces';
import { authApiService } from '../../../common/services/authClient';
import auth from '@react-native-firebase/auth';

const apiService = authApiService;

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
    try {
      await auth().signOut();
    } catch {
      /* ignore */
    }
  }

  /** Backend SMS OTP (optional; parent app primary flow is Firebase + `verifyOtp` with id token). */
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
