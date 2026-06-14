interface IFormField {
  value: string;
  isValid: boolean;
  error: string;
  isDirty?: boolean;
}

export interface ILoginFormState {
  mobileNumber: IFormField;
}

export interface IUser {
  id: number;
  name: string;
  role: string;
  mobile: string;
  clientName: string;
  clientId: number;
  email: string;
  profileImagePath: string;
}

export interface IAuth {
  isAuthenticated: boolean | null;
  user: IUser | null;
}

export interface IAuthState {
  auth: IAuth;
}
