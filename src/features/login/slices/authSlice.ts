import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IAuth, IUser } from '../interfaces';

const initialState: IAuth = {
  isAuthenticated: null,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<IUser>) {
      const p = action.payload;
      state.isAuthenticated = true;
      state.user = {
        ...p,
        clientId: p.clientId ?? state.user?.clientId ?? 0,
        clientName: p.clientName ?? state.user?.clientName ?? '',
      };
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
    },
  },
});

export const { loginSuccess, logout, userUpdateSuccess } = authSlice.actions;
export default authSlice.reducer;
