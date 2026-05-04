export interface IApiResponse {
  errors?: unknown;
  status: boolean;
  message: string;
  data: unknown;
  timestamp?: string;
}

export interface IApiRequestState {
  loading: boolean;
  message: string | null;
  error: string | null;
}
