import type { IApiResponse } from '../../../common/interfaces';
import type { IUser } from '../../login/interfaces';
import { getMe } from '../../../src/services/parent';

/** JWT `sub` is `p` + parent id for EduForest Parent; `/parent/me` uses numeric `id`. */
function parseParentNumericId(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('p') && raw.length > 1) {
      const n = Number(raw.slice(1));
      return Number.isFinite(n) ? n : 0;
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function mapParentMeToUser(data: Record<string, unknown> | null | undefined): IUser {
  if (!data || typeof data !== 'object') {
    return {
      id: 0,
      name: 'Parent',
      role: 'PARENT',
      mobile: '',
      clientName: '',
      clientId: 0,
      email: '',
      profileImagePath: '',
    };
  }
  const d = data as Record<string, unknown>;
  const rawId = d.id ?? d.sub;
  return {
    id: parseParentNumericId(rawId),
    name: String(d.firstName ?? d.name ?? 'Parent'),
    role: String(d.role ?? 'PARENT'),
    mobile: String(d.mobile ?? ''),
    clientName: String(d.clientName ?? d.instituteName ?? ''),
    clientId: Number(d.clientId) || 0,
    email: String(d.email ?? ''),
    profileImagePath: String(d.profileImagePath ?? ''),
  };
}

export class ParentProfileService {
  public static async getUser(): Promise<IApiResponse> {
    try {
      const response = await getMe();
      return response as IApiResponse;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Fetch user failed: ${msg}`);
    }
  }
}
