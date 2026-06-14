import axios, {
  type AxiosResponse,
  type AxiosRequestConfig,
  type CancelTokenSource,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isServerError,
  isNetworkError,
  NETWORK_ERROR_MESSAGE,
} from '../helpers/networkHelper';
import { GlobalToastService } from './GlobalToastService';
import { localStorageKeys } from '../constants';
import NetInfo from '@react-native-community/netinfo';

export class AuthApiService {
  private baseUrl: string;
  private cancelTokenSource: CancelTokenSource | null = null;
  private previousRequestConfig: AxiosRequestConfig | null = null;

  constructor(url: string) {
    this.baseUrl = url;
    this.initializeInterceptors();
  }

  private initializeInterceptors() {
    axios.interceptors.request.use((config) => {
      const c = config as AxiosRequestConfig & { headers?: Record<string, unknown> };
      c.headers = { ...c.headers };
      if (c.headers?.Authorization) {
        delete c.headers.Authorization;
      }
      return config;
    });

    axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          try {
            const { AuthService } = await import('../../features/login/services/AuthService');
            await AuthService.firebaseSignOut();
            await AsyncStorage.removeItem(localStorageKeys.ACCESS_TOKEN);
            const { store } = await import('../../redux/store');
            const { logout } = await import('../../features/login/slices/authSlice');
            store.dispatch(logout());
          } catch (logoutError) {
            console.error('Error during logout:', logoutError);
          }
          const expiredTokenError = new Error('Session expired. Please login again.');
          (expiredTokenError as { isTokenExpired?: boolean }).isTokenExpired = true;
          return Promise.reject(expiredTokenError);
        }

        const netInfoState = await NetInfo.fetch();
        const isConnected =
          netInfoState.isConnected && netInfoState.isInternetReachable;

        if (
          error?.code === 'ERR_NETWORK' &&
          (isConnected === false || isConnected === null)
        ) {
          const networkError = new Error(NETWORK_ERROR_MESSAGE);
          (networkError as { isNetworkError?: boolean }).isNetworkError = true;
          return Promise.reject(networkError);
        }

        if (
          error?.code === 'ERR_NETWORK' &&
          isConnected === true &&
          error?.isAxiosError &&
          !error?.response &&
          error?.request
        ) {
          GlobalToastService.showServerError();
          return Promise.reject(error);
        }

        if (isServerError(error)) {
          if (isConnected === true) {
            GlobalToastService.showServerError();
          } else {
            const networkError = new Error(NETWORK_ERROR_MESSAGE);
            (networkError as { isNetworkError?: boolean }).isNetworkError = true;
            return Promise.reject(networkError);
          }
        }

        if (isNetworkError(error)) {
          const networkError = new Error(NETWORK_ERROR_MESSAGE);
          (networkError as { isNetworkError?: boolean }).isNetworkError = true;
          return Promise.reject(networkError);
        }

        return Promise.reject(error);
      }
    );
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    cancelRequest = false
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'post',
      url: fullUrl,
      data,
    };
    return this.request<T>(requestConfig, cancelRequest);
  }

  public async get<T>(
    url: string,
    params?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const fullUrl = `${this.baseUrl}${url}`;
    const requestConfig: AxiosRequestConfig = {
      ...config,
      method: 'get',
      url: fullUrl,
      params,
    };
    return this.request<T>(requestConfig);
  }

  private async request<T>(
    config: AxiosRequestConfig,
    cancelRequest = false
  ): Promise<T> {
    try {
      if (cancelRequest && this.previousRequestConfig) {
        const { method: previousMethod, url: previousUrl } = this.previousRequestConfig;
        const { method, url } = config;
        if (
          this.cancelTokenSource &&
          previousMethod === method &&
          previousUrl === url
        ) {
          this.cancelTokenSource.cancel('Request canceled by the user');
        }
      }

      this.cancelTokenSource = axios.CancelToken.source();
      config.cancelToken = this.cancelTokenSource.token;
      this.previousRequestConfig = config;
      const response: AxiosResponse<T> = await axios(config);
      return response?.data;
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (axios.isCancel(error)) {
        console.error('[Request canceled]:', err.message);
        return Promise.reject('Request canceled by the user');
      }
      const ax = error as { response?: { data?: T } };
      if (ax?.response?.data) {
        return ax.response.data as T;
      }
      throw new Error(`[Request failed]: ${error}`);
    }
  }
}
