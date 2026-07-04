"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../lib/store/auth-store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ToastProvider } from "../ui/toast";

export const DashboardLayoutClient: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isInitializing, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isInitializing, isAuthenticated, router]);

  // Map route path names to header titles
  const getHeaderTitle = () => {
    if (pathname === "/dashboard") return "Dashboard Overview";
    if (pathname.startsWith("/dashboard/settings")) return "Restaurant Settings";
    if (pathname.startsWith("/dashboard/staff")) return "Staff Members";
    if (pathname.startsWith("/dashboard/subscription")) return "SaaS Subscription";
    if (pathname.startsWith("/dashboard/plans")) return "Platform Plans";
    if (pathname.startsWith("/dashboard/profile")) return "Account Profile";
    if (pathname.startsWith("/dashboard/roles")) return "Operational Roles";
    if (pathname.startsWith("/dashboard/customers")) return "Customer CRM Registry";
    if (pathname.startsWith("/dashboard/communication")) return "Marketing & Communications";
    if (pathname.startsWith("/dashboard/logs")) return "Email Auditing Logs";
    return "Dashboard";
  };

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-4" />
        <h2 className="text-lg font-bold tracking-wider">Restaurant OS</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Let the redirect hook handle it
  }

  // Strict Page Auth Control
  const getRequiredRoles = (path: string) => {
    if (path.startsWith("/dashboard/plans")) return ["SUPER_ADMIN"];
    if (path.startsWith("/dashboard/subscription")) return ["SUPER_ADMIN", "OWNER"];
    if (path.startsWith("/dashboard/settings")) return ["SUPER_ADMIN", "OWNER", "MANAGER"];
    if (path.startsWith("/dashboard/staff")) return ["SUPER_ADMIN", "OWNER", "MANAGER"];
    if (path.startsWith("/dashboard/customers")) return ["SUPER_ADMIN", "OWNER", "MANAGER"];
    if (path.startsWith("/dashboard/communication")) return ["SUPER_ADMIN", "OWNER", "MANAGER"];
    if (path.startsWith("/dashboard/logs")) return ["SUPER_ADMIN", "OWNER", "MANAGER"];
    return null;
  };

  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6 text-center bg-slate-50">
        <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-sm text-slate-600">
            This module is reserved for users with {requiredRoles.map(r => r.toLowerCase().replace("_", " ")).join(" or ")} clearance.
          </p>
          <button
            onClick={() => router.replace("/dashboard")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast notifications portal */}
      <ToastProvider />

      {/* Sidebar (Desktop and Mobile) */}
      <Sidebar />

      {/* Main Layout Area */}
      <div className="md:pl-64 flex flex-col flex-1 min-h-screen">
        <Header title={getHeaderTitle()} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
