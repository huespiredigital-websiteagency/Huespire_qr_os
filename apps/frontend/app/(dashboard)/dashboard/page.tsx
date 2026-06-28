"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../lib/api-client";
import { useAuthStore } from "../../../lib/store/auth-store";
import { useUIStore } from "../../../lib/store/ui-store";
import {
  Store,
  GitBranch,
  Users,
  CreditCard,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  Shield,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [branchesCount, setBranchesCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Execute fetches in parallel
        const [restRes, subRes, branchRes, staffRes] = await Promise.all([
          apiClient.get("/restaurants/me"),
          apiClient.get("/subscriptions/me"),
          apiClient.get("/branches"),
          apiClient.get("/staff"),
        ]);

        if (restRes.data?.success) setRestaurant(restRes.data.data);
        if (subRes.data?.success) setSubscription(subRes.data.data);
        if (branchRes.data?.success) setBranchesCount(branchRes.data.data.length);
        if (staffRes.data?.success) setStaffCount(staffRes.data.data.length);
      } catch (err: any) {
        console.error("Failed to load dashboard statistics:", err);
        addToast("Error fetching dashboard statistics. Make sure database is seeded.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isSuperAdmin, addToast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 bg-slate-200 rounded-2xl animate-pulse lg:col-span-2" />
          <div className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // 1. Super Admin Dashboard view
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-4">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              System Operators
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Platform Admin Control Centre
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Manage core configurations, monitor active SaaS subscription plan packages, define pricing structures, and audit platform security keys.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/plans"
                className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition"
              >
                Configure Platform Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Plan Packages</h3>
              <p className="text-xs text-slate-500">Create and tweak SaaS package parameters.</p>
            </div>
            <Link href="/dashboard/plans" className="mt-4 text-sm font-semibold text-indigo-600 flex items-center hover:text-indigo-700">
              Manage plans <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">System Roles</h3>
              <p className="text-xs text-slate-500">Inspect pre-defined system-wide security clearances.</p>
            </div>
            <Link href="/dashboard/roles" className="mt-4 text-sm font-semibold text-indigo-600 flex items-center hover:text-indigo-700">
              Inspect roles <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }


  // 2. Tenant Dashboard view (Owner/Manager/Staff)
  const activePlanName = subscription?.plan?.name || "No Plan";
  const limitBranches = subscription?.maxBranches || 0;
  const limitStaff = subscription?.maxStaff || 0;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Active Workspace
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome Back, {user?.firstName}!
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            You are managing <span className="text-white font-semibold">{restaurant?.name || "your restaurant"}</span>. Access quick actions, configure branches, onboard staff members, or inspect subscription metrics below.
          </p>
        </div>
      </div>

      {/* Quick Statistics Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Restaurant Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subdomain</p>
            <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
              {restaurant?.subdomain}.huespire.com
            </p>
          </div>
        </div>

        {/* Plan Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</p>
            <p className="text-sm font-bold text-slate-800">{activePlanName}</p>
          </div>
        </div>

        {/* Branches Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <GitBranch className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branches</p>
            <p className="text-sm font-bold text-slate-800">
              {branchesCount} <span className="text-xs text-slate-400 font-medium">/ {limitBranches}</span>
            </p>
          </div>
        </div>

        {/* Staff Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Accounts</p>
            <p className="text-sm font-bold text-slate-800">
              {staffCount} <span className="text-xs text-slate-400 font-medium">/ {limitStaff === 999999 ? "∞" : limitStaff}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main panel layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Restaurant Info and Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Restaurant Settings Profile</h3>
            <Link href="/dashboard/settings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
              Edit Settings <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-3 text-slate-600">
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{restaurant?.email || "No contact email"}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>{restaurant?.phone || "No contact phone"}</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {restaurant?.city ? `${restaurant.city}, ${restaurant.state || ""}` : "No address set"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span>Default Tax: {Number(restaurant?.taxPercentage || 0)}%</span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Quick Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/dashboard/branches"
                className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700 space-x-2"
              >
                <Plus className="h-4 w-4 text-slate-500" />
                <span>Add Branch</span>
              </Link>
              <Link
                href="/dashboard/staff"
                className="flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-semibold text-slate-700 space-x-2"
              >
                <Plus className="h-4 w-4 text-slate-500" />
                <span>Invite Staff</span>
              </Link>
              <Link
                href="/dashboard/subscription"
                className="flex items-center justify-center px-4 py-2 border border-indigo-200 bg-indigo-50/50 rounded-xl hover:bg-indigo-50 transition text-sm font-semibold text-indigo-700 space-x-2"
              >
                <span>Upgrade Plan</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column: Recent activities / system status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">
            Workspace Activity
          </h3>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Database connection active</p>
                <p className="text-xs text-slate-400">System synchronized successfully.</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-700">Authenticated session restored</p>
                <p className="text-xs text-slate-400">Logged in as {user?.role.toLowerCase()}.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
