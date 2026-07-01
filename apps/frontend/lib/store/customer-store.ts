import { create } from "zustand";
import { CartItemInput } from "../api/customer";

export interface CartItem extends CartItemInput {
  name: string;
  price: number;
  image?: string;
  variantName?: string | null;
  addonsList?: { id: string; name: string; price: number }[];
}

interface CustomerState {
  token: string | null;
  restaurant: {
    name: string;
    logoUrl: string | null;
    currency: string;
    taxPercentage: number;
    theme?: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  table: {
    id: string;
    tableName: string;
    tableNumber: string;
  } | null;
  categories: any[];
  addons: any[];
  cart: CartItem[];
  sessionId: string | null;
  orderIds: string[];
  guestId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  
  setToken: (token: string | null) => void;
  setMenuData: (data: any) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  loadCartFromStorage: (token: string) => void;
  setSessionId: (id: string | null) => void;
  addOrderId: (id: string) => void;
  setGuest: (guest: { id: string; name: string; phone: string } | null) => void;
  clearSession: () => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  token: null,
  restaurant: null,
  branch: null,
  table: null,
  categories: [],
  addons: [],
  cart: [],
  sessionId: null,
  orderIds: [],
  guestId: null,
  guestName: null,
  guestPhone: null,

  setToken: (token) => {
    set({ token });
    if (token) {
      get().loadCartFromStorage(token);
      if (typeof window !== "undefined") {
        const storedSession = localStorage.getItem(`sessionId_${token}`);
        const storedOrders = localStorage.getItem(`orderIds_${token}`);
        const storedGuestId = localStorage.getItem(`guestId_${token}`);
        const storedGuestName = localStorage.getItem(`guestName_${token}`);
        const storedGuestPhone = localStorage.getItem(`guestPhone_${token}`);
        set({
          sessionId: storedSession || null,
          orderIds: storedOrders ? JSON.parse(storedOrders) : [],
          guestId: storedGuestId || null,
          guestName: storedGuestName || null,
          guestPhone: storedGuestPhone || null
        });
      }
    }
  },

  setMenuData: (data) => {
    set({
      restaurant: data.restaurant,
      branch: data.branch,
      table: data.table,
      categories: data.categories,
      addons: data.addons,
    });
    if (data.activeSession && data.activeSession.id) {
      get().setSessionId(data.activeSession.id);
    }
  },

  addToCart: (newItem) => {
    const { cart, token } = get();
    
    // Find index of item with same menuItemId, variantId and identical addons
    const addonIdsStr = (newItem.addonIds || []).slice().sort().join(",");
    const existingIndex = cart.findIndex((item) => {
      const matchItem = item.menuItemId === newItem.menuItemId;
      const matchVariant = item.variantId === newItem.variantId;
      const itemAddonIdsStr = (item.addonIds || []).slice().sort().join(",");
      return matchItem && matchVariant && itemAddonIdsStr === addonIdsStr;
    });

    let updatedCart = [...cart];
    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += newItem.quantity;
      if (newItem.notes) {
        // Append notes or replace
        updatedCart[existingIndex].notes = updatedCart[existingIndex].notes 
          ? `${updatedCart[existingIndex].notes} | ${newItem.notes}`
          : newItem.notes;
      }
    } else {
      updatedCart.push(newItem);
    }

    set({ cart: updatedCart });
    if (token) {
      localStorage.setItem(`cart_${token}`, JSON.stringify(updatedCart));
    }
  },

  removeFromCart: (index) => {
    const { cart, token } = get();
    const updatedCart = cart.filter((_, i) => i !== index);
    set({ cart: updatedCart });
    if (token) {
      localStorage.setItem(`cart_${token}`, JSON.stringify(updatedCart));
    }
  },

  updateQuantity: (index, quantity) => {
    const { cart, token } = get();
    if (quantity <= 0) {
      get().removeFromCart(index);
      return;
    }
    const updatedCart = [...cart];
    updatedCart[index].quantity = quantity;
    set({ cart: updatedCart });
    if (token) {
      localStorage.setItem(`cart_${token}`, JSON.stringify(updatedCart));
    }
  },

  clearCart: () => {
    const { token } = get();
    set({ cart: [] });
    if (token) {
      localStorage.removeItem(`cart_${token}`);
    }
  },

  loadCartFromStorage: (token) => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`cart_${token}`);
      if (stored) {
        try {
          set({ cart: JSON.parse(stored) });
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      }
    }
  },

  setSessionId: (id) => {
    set({ sessionId: id });
    const { token } = get();
    if (token) {
      if (id) {
        localStorage.setItem(`sessionId_${token}`, id);
      } else {
        localStorage.removeItem(`sessionId_${token}`);
      }
    }
  },

  addOrderId: (id) => {
    const { orderIds, token } = get();
    if (!orderIds.includes(id)) {
      const updated = [...orderIds, id];
      set({ orderIds: updated });
      if (token) {
        localStorage.setItem(`orderIds_${token}`, JSON.stringify(updated));
      }
    }
  },

  setGuest: (guest) => {
    set({
      guestId: guest ? guest.id : null,
      guestName: guest ? guest.name : null,
      guestPhone: guest ? guest.phone : null
    });
    const { token } = get();
    if (token) {
      if (guest) {
        localStorage.setItem(`guestId_${token}`, guest.id);
        localStorage.setItem(`guestName_${token}`, guest.name);
        localStorage.setItem(`guestPhone_${token}`, guest.phone);
      } else {
        localStorage.removeItem(`guestId_${token}`);
        localStorage.removeItem(`guestName_${token}`);
        localStorage.removeItem(`guestPhone_${token}`);
      }
    }
  },

  clearSession: () => {
    const { token } = get();
    set({ sessionId: null, orderIds: [], guestId: null, guestName: null, guestPhone: null });
    if (token) {
      localStorage.removeItem(`sessionId_${token}`);
      localStorage.removeItem(`orderIds_${token}`);
      localStorage.removeItem(`guestId_${token}`);
      localStorage.removeItem(`guestName_${token}`);
      localStorage.removeItem(`guestPhone_${token}`);
    }
  },
}));
