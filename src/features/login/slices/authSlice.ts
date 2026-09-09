import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IAuth, IUser } from '../interfaces';

const initialState: IAuth = {
  isAuthenticated: null,
  user: null,
  mustResetPassword: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<IUser & { mustResetPassword?: boolean }>) {
      const { mustResetPassword, ...p } = action.payload;
      state.isAuthenticated = true;
      state.mustResetPassword = Boolean(mustResetPassword);
      state.user = {
        ...p,
        clientId: p.clientId ?? state.user?.clientId ?? 0,
        clientName: p.clientName ?? state.user?.clientName ?? '',
      };
    },
    passwordResetCompleted(state) {
      state.mustResetPassword = false;
    },
    userUpdateSuccess(state, action: PayloadAction<Partial<IUser>>) {
      state.isAuthenticated = true;
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.mustResetPassword = false;
    },
  },
});

export const { loginSuccess, logout, userUpdateSuccess, passwordResetCompleted } =
  authSlice.actions;
export default authSlice.reducer;
