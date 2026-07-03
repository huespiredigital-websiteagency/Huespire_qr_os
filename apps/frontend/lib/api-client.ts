import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const getTenantDomain = (): string => {
  if (typeof window !== "undefined") {
    return window.location.host; // e.g., pizza.localhost:3000 or pizza.huespire.digital
  }
  // Fallback for SSR / Server Components
  try {
    const { headers } = require("next/headers");
    const hostHeader = headers().get("host");
    return hostHeader || "";
  } catch {
    return "";
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Inject Tenant Domain and Auth Token
apiClient.interceptors.request.use(
  (config) => {
    // 1. Inject X-Tenant-Domain dynamically for backend multi-tenancy
    const tenantDomain = getTenantDomain();
    if (tenantDomain) {
      config.headers["X-Tenant-Domain"] = tenantDomain;
    }

    // 2. Inject JWT token from localStorage on the client side
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized globally
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        const path = window.location.pathname;
        if (path.startsWith("/admin")) {
          if (path !== "/admin/login") {
            window.location.href = "/admin/login?expired=true";
          }
        } else {
          if (!path.startsWith("/login")) {
            window.location.href = "/login?expired=true";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
