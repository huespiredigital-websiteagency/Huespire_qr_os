"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Filter,
  TrendingUp,
  Utensils,
  ChevronRight,
  MessageSquare
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { getSocket } from "../../../../lib/socket";

export default function KitchenDashboardPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters state
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "longest_waiting">("longest_waiting");
  const [tableFilter, setTableFilter] = useState<string>("");

  // Data state
  const [kdsData, setKdsData] = useState<{
    metrics: {
      newOrdersCount: number;
      preparingCount: number;
      readyCount: number;
      avgPrepTimeMinutes: number;
      ordersTodayCount: number;
    };
    columns: {
      newOrders: any[];
      preparingOrders: any[];
      readyOrders: any[];
      completedOrders: any[];
    };
  }>({
    metrics: {
      newOrdersCount: 0,
      preparingCount: 0,
      readyCount: 0,
      avgPrepTimeMinutes: 12,
      ordersTodayCount: 0
    },
    columns: {
      newOrders: [],
      preparingOrders: [],
      readyOrders: [],
      completedOrders: []
    }
  });

  // Action modal state
  const [rejectModalOrderId, setRejectModalOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  const fetchKitchenOrders = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (sortBy) params.append("sortBy", sortBy);
      if (tableFilter) params.append("tableId", tableFilter);

      const response = await apiClient.get(`/kitchen/orders?${params.toString()}`);
      if (response.data?.success) {
        setKdsData(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      if (!isBackground) {
        addToast(err.response?.data?.message || "Failed to load kitchen display.", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchKitchenOrders(true);
    };

    socket.on("order.created", handleUpdate);
    socket.on("order.accepted", handleUpdate);
    socket.on("order.preparing", handleUpdate);
    socket.on("order.ready", handleUpdate);
    socket.on("order.cancelled", handleUpdate);

    return () => {
      socket.off("order.created", handleUpdate);
      socket.off("order.accepted", handleUpdate);
      socket.off("order.preparing", handleUpdate);
      socket.off("order.ready", handleUpdate);
      socket.off("order.cancelled", handleUpdate);
    };
  }, [sortBy, tableFilter]);

  const handleAccept = async (orderId: string) => {
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/kitchen/orders/${orderId}/accept`);
      if (res.data?.success) {
        addToast("Order accepted!", "success");
        fetchKitchenOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to accept order.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleStartPrepare = async (orderId: string) => {
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/kitchen/orders/${orderId}/prepare`);
      if (res.data?.success) {
        addToast("Preparation started!", "success");
        fetchKitchenOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to start preparation.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkReady = async (orderId: string) => {
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/kitchen/orders/${orderId}/ready`);
      if (res.data?.success) {
        addToast("Order marked READY for waiter pickup!", "success");
        fetchKitchenOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to mark order ready.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalOrderId) return;
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/kitchen/orders/${rejectModalOrderId}/reject`, {
        reason: rejectReason || undefined
      });
      if (res.data?.success) {
        addToast("Order rejected.", "info");
        setRejectModalOrderId(null);
        setRejectReason("");
        fetchKitchenOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to reject order.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KDS Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 text-white p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Flame className="h-6 w-6 mr-2 text-orange-500 animate-pulse" />
            Kitchen Display System (KDS)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time order cooking workflow. Live sync active (Polling 7s).
          </p>
        </div>
        <Button
          onClick={() => fetchKitchenOrders(false)}
          className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? "animate-spin text-orange-400" : ""}`} />
          Refresh Orders
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">New Orders</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{kdsData.metrics.newOrdersCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Preparing</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">{kdsData.metrics.preparingCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ready for Pickup</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{kdsData.metrics.readyCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Prep Time</span>
            <div className="text-2xl font-black text-white mt-1">{kdsData.metrics.avgPrepTimeMinutes}m</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-300 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orders Today</span>
            <div className="text-2xl font-black text-slate-200 mt-1">{kdsData.metrics.ordersTodayCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-300 flex items-center justify-center">
            <Utensils className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-orange-400" />
          <span>Kitchen Filters</span>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-semibold whitespace-nowrap">Sort By:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-850 border border-slate-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 w-full sm:w-48"
          >
            <option value="longest_waiting">Longest Waiting</option>
            <option value="oldest">Oldest First</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      {/* KDS Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMN 1: NEW ORDERS */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-amber-400 flex items-center uppercase tracking-wider">
              <Clock className="h-4 w-4 mr-2" />
              New Orders ({kdsData.columns.newOrders.length})
            </h3>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {kdsData.columns.newOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No pending orders</div>
            ) : (
              kdsData.columns.newOrders.map((ord) => (
                <div key={ord.id} className="bg-neutral-850 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        T-{ord.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.priority === "URGENT" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {ord.elapsedMinutes}m waiting
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 text-xs">
                    {ord.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start bg-slate-900/60 p-2 rounded-xl">
                        <div>
                          <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                          <span className="text-slate-200">{it.name}</span>
                          {it.variants.length > 0 && <div className="text-[10px] text-indigo-400 font-medium">({it.variants.join(", ")})</div>}
                          {it.addons.length > 0 && <div className="text-[10px] text-emerald-400 font-medium">+ {it.addons.join(", ")}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {ord.specialInstructions && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] p-2 rounded-xl flex items-start space-x-1.5">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{ord.specialInstructions}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      onClick={() => setRejectModalOrderId(ord.id)}
                      disabled={processingAction}
                      className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleAccept(ord.id)}
                      disabled={processingAction}
                      className="bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-xs font-bold cursor-pointer shadow"
                    >
                      Accept Order
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center uppercase tracking-wider">
              <Flame className="h-4 w-4 mr-2" />
              Preparing ({kdsData.columns.preparingOrders.length})
            </h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {kdsData.columns.preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No orders currently cooking</div>
            ) : (
              kdsData.columns.preparingOrders.map((ord) => (
                <div key={ord.id} className="bg-neutral-850 border border-indigo-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        T-{ord.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                      Cooking ({ord.elapsedMinutes}m)
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 text-xs">
                    {ord.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start bg-slate-900/60 p-2 rounded-xl">
                        <div>
                          <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                          <span className="text-slate-200">{it.name}</span>
                          {it.variants.length > 0 && <div className="text-[10px] text-indigo-400 font-medium">({it.variants.join(", ")})</div>}
                          {it.addons.length > 0 && <div className="text-[10px] text-emerald-400 font-medium">+ {it.addons.join(", ")}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {ord.specialInstructions && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] p-2 rounded-xl flex items-start space-x-1.5">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{ord.specialInstructions}</span>
                    </div>
                  )}

                  {/* Action */}
                  <Button
                    onClick={() => handleMarkReady(ord.id)}
                    disabled={processingAction}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-lg mt-2 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark Ready for Pickup
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR PICKUP */}
        <div className="bg-slate-900/50 rounded-3xl p-4 border border-slate-800 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Ready ({kdsData.columns.readyOrders.length})
            </h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {kdsData.columns.readyOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No orders waiting for pickup</div>
            ) : (
              kdsData.columns.readyOrders.map((ord) => (
                <div key={ord.id} className="bg-neutral-850 border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-lg opacity-90">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        T-{ord.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      Waiting Pickup
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1">
                    {ord.items.map((it: any, idx: number) => (
                      <div key={idx} className="font-semibold text-white">
                        {it.quantity}x {it.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectModalOrderId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="text-md font-bold text-white flex items-center">
              <AlertTriangle className="h-5 w-5 text-rose-500 mr-2" />
              Reject Order
            </h3>
            <p className="text-xs text-slate-400">Specify reason for rejecting this order:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Item out of stock"
              className="w-full bg-neutral-850 border border-slate-800 text-white text-xs rounded-xl p-3 h-24 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setRejectModalOrderId(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={processingAction}
                className="bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
