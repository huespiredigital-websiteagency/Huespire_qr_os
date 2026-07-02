import { apiClient } from "../api-client";

// Categories
export const getCategories = async () => {
  const res = await apiClient.get(`/categories?limit=1000`);
  return res.data;
};

export const createCategory = async (data: any) => {
  const res = await apiClient.post(`/categories`, data);
  return res.data;
};

export const updateCategory = async (id: string, data: any) => {
  const res = await apiClient.patch(`/categories/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id: string) => {
  const res = await apiClient.delete(`/categories/${id}`);
  return res.data;
};

// Menu Items
export const getMenuItems = async (categoryId?: string) => {
  const url = categoryId ? `/menu-items?limit=1000&categoryId=${categoryId}` : `/menu-items?limit=1000`;
  const res = await apiClient.get(url);
  return res.data;
};

export const createMenuItem = async (data: any) => {
  const res = await apiClient.post(`/menu-items`, data);
  return res.data;
};

export const updateMenuItem = async (id: string, data: any) => {
  const res = await apiClient.patch(`/menu-items/${id}`, data);
  return res.data;
};

export const deleteMenuItem = async (id: string) => {
  const res = await apiClient.delete(`/menu-items/${id}`);
  return res.data;
};

// Variants
export const getVariants = async (menuItemId?: string) => {
  const url = menuItemId ? `/variants?menuItemId=${menuItemId}` : `/variants`;
  const res = await apiClient.get(url);
  return res.data;
};

export const createVariant = async (data: any) => {
  const res = await apiClient.post(`/variants`, data);
  return res.data;
};

export const updateVariant = async (id: string, data: any) => {
  const res = await apiClient.patch(`/variants/${id}`, data);
  return res.data;
};

export const deleteVariant = async (id: string) => {
  const res = await apiClient.delete(`/variants/${id}`);
  return res.data;
};

// Add-ons
export const getAddons = async () => {
  const res = await apiClient.get(`/addons`);
  return res.data;
};

export const createAddon = async (data: any) => {
  const res = await apiClient.post(`/addons`, data);
  return res.data;
};

export const updateAddon = async (id: string, data: any) => {
  const res = await apiClient.patch(`/addons/${id}`, data);
  return res.data;
};

export const deleteAddon = async (id: string) => {
  const res = await apiClient.delete(`/addons/${id}`);
  return res.data;
};

// Images
export const uploadMenuImage = async (menuItemId: string, file: File, isPrimary: boolean = false) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("isPrimary", isPrimary ? "true" : "false");

  const res = await apiClient.post(`/menu-images/${menuItemId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const deleteMenuImage = async (imageId: string) => {
  const res = await apiClient.delete(`/menu-images/${imageId}`);
  return res.data;
};
