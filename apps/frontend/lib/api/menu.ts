import axios from "axios";
import { API_URL } from "../api-client";

export const getAuthHeaders = () => {
  let token = "";
  if (typeof window !== "undefined") {
    token = localStorage.getItem("accessToken") || "";
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// Categories
export const getCategories = async () => {
  const res = await axios.get(`${API_URL}/categories?limit=1000`, { headers: getAuthHeaders() });
  return res.data;
};

export const createCategory = async (data: any) => {
  const res = await axios.post(`${API_URL}/categories`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const updateCategory = async (id: string, data: any) => {
  const res = await axios.patch(`${API_URL}/categories/${id}`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const deleteCategory = async (id: string) => {
  const res = await axios.delete(`${API_URL}/categories/${id}`, { headers: getAuthHeaders() });
  return res.data;
};

// Menu Items
export const getMenuItems = async (categoryId?: string) => {
  const url = categoryId ? `${API_URL}/menu-items?limit=1000&categoryId=${categoryId}` : `${API_URL}/menu-items?limit=1000`;
  const res = await axios.get(url, { headers: getAuthHeaders() });
  return res.data;
};

export const createMenuItem = async (data: any) => {
  const res = await axios.post(`${API_URL}/menu-items`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const updateMenuItem = async (id: string, data: any) => {
  const res = await axios.patch(`${API_URL}/menu-items/${id}`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const deleteMenuItem = async (id: string) => {
  const res = await axios.delete(`${API_URL}/menu-items/${id}`, { headers: getAuthHeaders() });
  return res.data;
};

// Variants
export const getVariants = async (menuItemId?: string) => {
  const url = menuItemId ? `${API_URL}/variants?menuItemId=${menuItemId}` : `${API_URL}/variants`;
  const res = await axios.get(url, { headers: getAuthHeaders() });
  return res.data;
};

export const createVariant = async (data: any) => {
  const res = await axios.post(`${API_URL}/variants`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const updateVariant = async (id: string, data: any) => {
  const res = await axios.patch(`${API_URL}/variants/${id}`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const deleteVariant = async (id: string) => {
  const res = await axios.delete(`${API_URL}/variants/${id}`, { headers: getAuthHeaders() });
  return res.data;
};

// Add-ons
export const getAddons = async () => {
  const res = await axios.get(`${API_URL}/addons`, { headers: getAuthHeaders() });
  return res.data;
};

export const createAddon = async (data: any) => {
  const res = await axios.post(`${API_URL}/addons`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const updateAddon = async (id: string, data: any) => {
  const res = await axios.patch(`${API_URL}/addons/${id}`, data, { headers: getAuthHeaders() });
  return res.data;
};

export const deleteAddon = async (id: string) => {
  const res = await axios.delete(`${API_URL}/addons/${id}`, { headers: getAuthHeaders() });
  return res.data;
};

// Images
export const uploadMenuImage = async (menuItemId: string, file: File, isPrimary: boolean = false) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("isPrimary", isPrimary ? "true" : "false");

  const headers = { ...getAuthHeaders(), "Content-Type": "multipart/form-data" };

  const res = await axios.post(`${API_URL}/menu-images/${menuItemId}`, formData, { headers });
  return res.data;
};

export const deleteMenuImage = async (imageId: string) => {
  const res = await axios.delete(`${API_URL}/menu-images/${imageId}`, { headers: getAuthHeaders() });
  return res.data;
};
