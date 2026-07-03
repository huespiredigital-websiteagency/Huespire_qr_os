"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Activity,
  Database,
  Cpu,
  Loader2,
  HardDrive,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function AdminHealth() {
  const { addToast } = useUIStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/health");
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch {
      addToast("Failed to fetch system health status", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-800 rounded-lg w-1/4" />
        <div className="h-40 bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-slate-800 rounded-2xl" />
          <div className="h-48 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const indicators = [
    { name: "Database Service", key: "database", icon: Database },
    { name: "Redis Caching", key: "redis", icon: HardDrive },
    { name: "Socket Gateway", key: "socket", icon: Activity },
    { name: "Nginx Proxy", key: "nginx", icon: RefreshCw },
  ];

  return (
    <div className="space-y-8">
      {/* Header and Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">System Infrastructure Health</h1>
          <p className="text-slate-400 text-sm">Real-time status indicators of platform nodes, databases, and microservices.</p>
        </div>
        <button
          onClick={fetchHealth}
          className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {indicators.map((srv) => {
          const Icon = srv.icon;
          const srvStatus = data[srv.key]?.status || "DOWN";
          return (
            <div key={srv.name} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-slate-950 text-indigo-400 border border-slate-800 rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                  srvStatus === "UP" || srvStatus === "HEALTHY"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}>
                  {srvStatus}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{srv.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">Status: Stable and responding</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Host hardware monitor */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
        <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-indigo-400" />
          Host hardware monitor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* OS details */}
          <div className="space-y-4 text-xs font-semibold text-slate-400">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>Operating System:</span>
              <span className="text-white uppercase font-mono">{data.server?.platform} ({data.server?.arch})</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>Logical Processors:</span>
              <span className="text-white font-mono">{data.server?.cpuCount} Cores</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>System Load Average (1m):</span>
              <span className="text-white font-mono">{data.server?.cpuLoad1Min || "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span>System Load Average (5m):</span>
              <span className="text-white font-mono">{data.server?.cpuLoad5Min || "0.00"}</span>
            </div>
          </div>

          {/* RAM stats */}
          <div className="space-y-4 text-xs font-semibold text-slate-400">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>Total Available Memory:</span>
              <span className="text-white font-mono">{data.server?.memoryTotalGB} GB</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>Active Used Memory:</span>
              <span className="text-white font-mono">{data.server?.memoryUsedGB} GB</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span>Memory Free:</span>
              <span className="text-white font-mono">{(Number(data.server?.memoryTotalGB) - Number(data.server?.memoryUsedGB)).toFixed(2)} GB</span>
            </div>
            <div className="flex justify-between">
              <span>Memory Usage load:</span>
              <span className="text-white font-mono">{data.server?.memoryUsagePercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
