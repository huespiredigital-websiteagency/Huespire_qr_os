import axios from "axios";
import { API_URL } from "./api-client";

// Helper client mapping API requests
export const authClient = {
  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    return response.data;
  },
  register: async (data: any) => {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  },
  getCurrentUser: async (token: string) => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
