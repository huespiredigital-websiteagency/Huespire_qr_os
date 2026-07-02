import { apiClient } from "./api-client";

// Helper client mapping API requests
export const authClient = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post(`/auth/login`, { email, password });
    return response.data;
  },
  register: async (data: any) => {
    const response = await apiClient.post(`/auth/register`, data);
    return response.data;
  },
  getCurrentUser: async (token: string) => {
    const response = await apiClient.get(`/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
