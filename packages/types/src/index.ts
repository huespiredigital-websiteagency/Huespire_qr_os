export interface User {
  id: string;
  restaurantId: string | null;
  roleId: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  subdomain: string;
  customDomain: string | null;
  timezone: string;
  currency: string;
  taxPercentage: number;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  openingTime: string;
  closingTime: string;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  price: number;
  taxPercentage: number;
  preparationTime: number;
  calories: number | null;
  isVeg: boolean;
  isVegan: boolean;
  isSpicy: boolean;
  isAvailable: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  restaurantId: string;
  branchId: string;
  tableId: string;
  customerId: string;
  orderNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  restaurantId: string;
  orderId: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  transactionReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  restaurantId: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
}
