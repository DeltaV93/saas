import { create } from 'zustand';

interface AuthState {
  user: { name: string; role: string } | null;
  setUser: (user: { name: string; role: string } | null) => void;
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