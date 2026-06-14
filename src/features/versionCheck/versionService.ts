import Constants from 'expo-constants';
import { compareVersions } from './compareVersions';
import { api, ApiEnvelope } from '../../services/api';

export interface VersionResponse {
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
}

export interface VersionCheckResult {
  forceUpdate: boolean;
  latestVersion: string;
}

const FALLBACK_APP_VERSION = '1.0.0';

/** Set to true when force-update should block outdated app versions. */
const FORCE_UPDATE_ENABLED = false;

export const getInstalledAppVersion = () =>
  Constants.expoConfig?.version || FALLBACK_APP_VERSION;

export class VersionService {
  public static async checkAppVersion(): Promise<VersionCheckResult> {
    if (!FORCE_UPDATE_ENABLED) {
      return { forceUpdate: false, latestVersion: '' };
    }

    try {
      const { data } = await api.get<ApiEnvelope>(`/clients/app/version/check`);
      const body = data?.data as VersionResponse | undefined;
      if (!body?.minRequiredVersion) {
        return { forceUpdate: false, latestVersion: '' };
      }
      const deviceInstalledVersion = getInstalledAppVersion();
      const isBelowMin =
        compareVersions(deviceInstalledVersion, body.minRequiredVersion) === -1;

      return {
        forceUpdate: Boolean(body.forceUpdate) && isBelowMin,
        latestVersion: body.latestVersion ?? '',
      };
    } catch {
      return { forceUpdate: false, latestVersion: '' };
    }
  }
}
