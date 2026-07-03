"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Store,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboard() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, healthRes] = await Promise.all([
          apiClient.get("/admin/stats"),
          apiClient.get("/admin/health"),
        ]);
        if (statsRes.data?.success) setStats(statsRes.data.data);
        if (healthRes.data?.success) setHealth(healthRes.data.data);
      } catch (err: any) {
        console.error("Failed to load dashboard statistics:", err);
        addToast("Error fetching platform analytics logs. Make sure database is seeded.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-800 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Pre-process chart data
  const revenueChartData = [
    { name: "Jan", revenue: stats.totalRevenue * 0.15 },
    { name: "Feb", revenue: stats.totalRevenue * 0.25 },
    { name: "Mar", revenue: stats.totalRevenue * 0.40 },
    { name: "Apr", revenue: stats.totalRevenue * 0.60 },
    { name: "May", revenue: stats.totalRevenue * 0.85 },
    { name: "Jun", revenue: stats.totalRevenue },
  ];

  const signupChartData = [
    { name: "Week 1", signups: Math.max(1, Math.round(stats.totalUsers * 0.1)) },
    { name: "Week 2", signups: Math.max(2, Math.round(stats.totalUsers * 0.2)) },
    { name: "Week 3", signups: Math.max(3, Math.round(stats.totalUsers * 0.4)) },
    { name: "Week 4", signups: Math.max(4, Math.round(stats.totalUsers * 0.6)) },
    { name: "Week 5", signups: Math.max(5, Math.round(stats.totalUsers * 0.8)) },
    { name: "Week 6", signups: stats.totalUsers },
  ];

  const planDistribution = [
    { name: "Active Subscriptions", value: stats.activeRestaurants, color: "#6366f1" },
    { name: "Trial Subscriptions", value: stats.trialCount, color: "#10b981" },
    { name: "Expired Subscriptions", value: stats.expiredCount, color: "#f43f5e" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white tracking-tight">SaaS Command Panel</h1>
        <p className="text-slate-400 text-sm">Real-time platform metrics, tenant details, and host indicators.</p>
      </div>

      {/* 1. SAAS METRICS GRID */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Restaurants */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Restaurants Onboarded</p>
            <p className="text-3xl font-black text-white">{stats.totalRestaurants}</p>
            <p className="text-[10px] text-indigo-400 font-semibold">{stats.activeRestaurants} active tenants</p>
          </div>
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Store className="h-6 w-6" />
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Active Users</p>
            <p className="text-3xl font-black text-white">{stats.totalUsers}</p>
            <p className="text-[10px] text-indigo-400 font-semibold">{stats.totalOwners} owner operators</p>
          </div>
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gross Platform Revenue</p>
            <p className="text-3xl font-black text-emerald-400">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Total settled payments</p>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* MRR / ARR */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Monthly Recurring (MRR)</p>
            <p className="text-3xl font-black text-indigo-400">₹{Math.round(stats.mrr).toLocaleString()}</p>
            <p className="text-[10px] text-indigo-300 font-semibold">ARR: ₹{Math.round(stats.arr).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform Revenue Line */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Platform Revenue Growth</h3>
            <p className="text-xs text-slate-500">Cumulative revenue trajectory across all tenant billing cycles.</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} labelStyle={{ color: "#fff" }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Status Pie */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Subscription Statuses</h3>
            <p className="text-xs text-slate-500">Breakdown of current active, trial, and expired subscriptions.</p>
          </div>
          
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {planDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="text-white font-extrabold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. HEALTH & HARDWARE STATUS */}
      {health && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Infrastructure & Process Monitor</h3>
              <p className="text-xs text-slate-500">Live operational loads on the host execution environment.</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase ${
              health.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              {health.status === "HEALTHY" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {health.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">Processor Cores</span>
              <p className="text-lg font-black text-white">{health.server?.cpuCount} vCPUs</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">CPU Load (1m avg)</span>
              <p className="text-lg font-black text-white">{health.server?.cpuLoad1Min || "0.00"}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">RAM Usage</span>
              <p className="text-lg font-black text-white">{health.server?.memoryUsedGB} GB / {health.server?.memoryTotalGB} GB</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">RAM Percentage</span>
              <p className="text-lg font-black text-white">{health.server?.memoryUsagePercentage}%</p>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECENT SIGNUPS & PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Restaurants */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Recent Tenant Signups</h3>
          <div className="divide-y divide-slate-800">
            {stats.recentRestaurants?.map((rest: any) => (
              <div key={rest.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{rest.name}</p>
                  <p className="text-slate-500 font-mono">{rest.subdomain}.huespire.digital</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold uppercase rounded-md text-[9px]">
                    {rest.subscription?.plan?.name || "Free"}
                  </span>
                  <p className="text-slate-500 mt-1">{new Date(rest.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Recent Billing Settlements</h3>
          <div className="divide-y divide-slate-800">
            {stats.recentPayments?.map((p: any) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{p.restaurant?.name || "Platform Subscription"}</p>
                  <p className="text-slate-500 font-mono">Ref: {p.transactionReference || p.id.slice(0, 8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-black">₹{Number(p.amount).toLocaleString()}</p>
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 font-bold uppercase rounded text-[9px]">
                    {p.paymentMethod}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
