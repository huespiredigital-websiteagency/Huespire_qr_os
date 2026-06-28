import { create } from "zustand";
import { apiClient } from "../api-client";

interface User {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: string;
  restaurantId: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  login: (token, userData) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    set({
      accessToken: token,
      user: userData,
      isAuthenticated: true,
      isInitializing: false,
    });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  },

  updateProfile: (updatedData) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...updatedData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  restoreSession: async () => {
    set({ isInitializing: true });
    try {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        // Double check session with auth/me
        const response = await apiClient.get("/auth/me");
        if (response.data?.success && response.data.data) {
          const user = response.data.data;
          set({
            accessToken: token,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              restaurantId: user.restaurantId,
            },
            isAuthenticated: true,
          });
        } else {
          // session expired or invalid
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          set({ accessToken: null, user: null, isAuthenticated: false });
        }
      } else {
        set({ accessToken: null, user: null, isAuthenticated: false });
      }
    } catch (error) {
      // API call failed - keep stored session if offline, but if 401 response interceptor will clear it
      console.error("Failed to restore session:", error);
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");
      if (token && storedUser) {
        set({
          accessToken: token,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
        });
      } else {
        set({ accessToken: null, user: null, isAuthenticated: false });
      }
    } finally {
      set({ isInitializing: false });
    }
  },
}));
// Fix typo on set { isInitializing: false }
