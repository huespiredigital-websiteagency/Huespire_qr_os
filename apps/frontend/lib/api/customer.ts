import { apiClient } from "../api-client";

export interface CartItemInput {
  menuItemId: string;
  quantity: number;
  variantId?: string | null;
  addonIds?: string[] | null;
  notes?: string | null;
}

export interface CreateOrderInput {
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: CartItemInput[];
}

export const getCustomerMenu = async (token: string) => {
  const res = await apiClient.get(`/customer/menu`, { params: { token } });
  return res.data;
};

export const getCustomerCategories = async (token: string) => {
  const res = await apiClient.get(`/customer/categories`, { params: { token } });
  return res.data;
};

export const getCustomerMenuItems = async (token: string, categoryId?: string) => {
  const res = await apiClient.get(`/customer/menu-items`, { params: { token, categoryId } });
  return res.data;
};

export const getCustomerMenuItem = async (token: string, id: string) => {
  const res = await apiClient.get(`/customer/menu-items/${id}`, { params: { token } });
  return res.data;
};

export const validateCustomerCart = async (token: string, items: CartItemInput[]) => {
  const res = await apiClient.post(`/customer/cart/validate`, { items }, { params: { token } });
  return res.data;
};

export const createCustomerOrder = async (token: string, data: CreateOrderInput) => {
  const res = await apiClient.post(`/customer/orders`, data, { params: { token } });
  return res.data;
};

export const getCustomerOrder = async (id: string) => {
  const res = await apiClient.get(`/customer/orders/${id}`);
  return res.data;
};

export const getCustomerOrderStatus = async (id: string) => {
  const res = await apiClient.get(`/customer/orders/${id}/status`);
  return res.data;
};

export const getCustomerTableSession = async (token: string) => {
  const res = await apiClient.get(`/customer/table-session`, { params: { token } });
  return res.data;
};
