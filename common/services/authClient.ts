import { AuthApiService } from './AuthApiService';
import { Env } from '../../config/envConfig';

const baseUrl = Env.apiUrl;

if (!baseUrl) {
  console.warn('[authClient] Empty API base URL – check env/.env.development or extra.apiUrl');
}

export const authApiService = new AuthApiService(baseUrl);
