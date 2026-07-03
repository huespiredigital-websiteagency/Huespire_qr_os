"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../../lib/store/auth-store";
import { apiClient } from "../../../lib/api-client";
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  FileText,
  Activity,
  LogOut,
  Shield,
  Loader2,
  AlertCircle,
  Undo2,
} from "lucide-react";
import { ToastProvider } from "../../../components/ui/toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isInitializing, restoreSession } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>("HEALTHY");

  // Impersonation detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("adminAccessToken");
      if (adminToken) {
        setImpersonating(true);
      }
    }
  }, []);

  // Fetch quick platform health indicator
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await apiClient.get("/admin/health");
        if (res.data?.success && res.data.data?.status) {
          setHealthStatus(res.data.data.status);
        }
      } catch {
        setHealthStatus("CRITICAL");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Restore and validate session
  useEffect(() => {
    const init = async () => {
      await restoreSession();
    };
    init();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      if (!user || user.role !== "SUPER_ADMIN") {
        setIsAdmin(false);
        if (pathname !== "/admin/login") {
          router.replace("/admin/login");
        }
      } else {
        setIsAdmin(true);
      }
    }
  }, [user, isInitializing, router, pathname]);

  const handleReturnToAdmin = () => {
    if (typeof window !== "undefined") {
      const adminToken = localStorage.getItem("adminAccessToken");
      const adminUser = localStorage.getItem("adminUser");
      if (adminToken && adminUser) {
        localStorage.setItem("accessToken", adminToken);
        localStorage.setItem("user", adminUser);
        localStorage.removeItem("adminAccessToken");
        localStorage.removeItem("adminUser");
        
        // Find admin host domain
        const host = window.location.host;
        let adminHost = "admin.huespire.digital";
        if (host.includes("localhost")) {
          adminHost = "admin.localhost:3000";
        }
        window.location.href = `${window.location.protocol}//${adminHost}/admin/dashboard`;
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/admin/login");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide">Initializing Super Admin Portal...</p>
      </div>
    );
  }

  // If not logged in as Admin and not on login page, show loading state while routing
  if (!isAdmin && pathname !== "/admin/login") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Redirecting to authorization gateway...</p>
      </div>
    );
  }

  // Login page should not render sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Restaurants", href: "/admin/restaurants", icon: Store },
    { name: "Subscription Plans", href: "/admin/subscriptions", icon: CreditCard },
    { name: "Audit Logs", href: "/admin/logs", icon: FileText },
    { name: "System Health", href: "/admin/health", icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 1. IMPERSONATION BANNER */}
      {impersonating && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 text-center text-xs font-black flex items-center justify-center gap-2 relative z-50 shadow-md">
          <AlertCircle className="h-4 w-4 animate-bounce" />
          <span>IMPERSONATING RESTAURANT ENVIRONMENT (LOGGED IN AS OWNER)</span>
          <button
            onClick={handleReturnToAdmin}
            className="ml-4 bg-white/20 hover:bg-white/30 text-white font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Undo2 className="h-3 w-3" />
            Return to Super Admin
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 2. SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white">Restaurant OS</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Super Admin</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* System Health Check Indicator */}
          <div className="p-4 border-t border-slate-800 space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Platform Status</p>
                <p className="text-xs font-extrabold text-white">All Systems Go</p>
              </div>
              <div className="relative flex h-3.5 w-3.5">
                {healthStatus === "HEALTHY" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out Panel
            </button>
          </div>
        </aside>

        {/* 3. MAIN DASHBOARD CONTENT VIEWPORT */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
      <ToastProvider />
    </div>
  );
}
