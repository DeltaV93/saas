import { create } from 'zustand';
import { User } from '../types/api';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  setRole: (role: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set((state) => ({ ...state, user })),
  logout: () => set((state) => ({ ...state, user: null })),
  setRole: (role) => set((state) => ({
    ...state,
    user: state.user ? { ...state.user, role } : null,
  })),
})); 