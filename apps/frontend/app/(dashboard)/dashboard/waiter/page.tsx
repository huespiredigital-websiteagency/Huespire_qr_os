"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  ChefHat,
  Bell,
  CheckCircle2,
  RefreshCw,
  Clock,
  TrendingUp,
  ShoppingBag,
  User,
  Utensils
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { getSocket } from "../../../../lib/socket";

export default function WaiterDashboardPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ready" | "serving" | "served">("ready");

  const [wdsData, setWdsData] = useState<{
    metrics: {
      readyCount: number;
      servingCount: number;
      servedTodayCount: number;
      avgDeliveryMinutes: number;
    };
    sections: {
      readyOrders: any[];
      servingOrders: any[];
      servedOrders: any[];
    };
  }>({
    metrics: {
      readyCount: 0,
      servingCount: 0,
      servedTodayCount: 0,
      avgDeliveryMinutes: 3.5
    },
    sections: {
      readyOrders: [],
      servingOrders: [],
      servedOrders: []
    }
  });

  const [processingAction, setProcessingAction] = useState<boolean>(false);

  const fetchWaiterOrders = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const response = await apiClient.get("/waiter/orders");
      if (response.data?.success) {
        setWdsData(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      if (!isBackground) {
        addToast(err.response?.data?.message || "Failed to load waiter display.", "error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWaiterOrders();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchWaiterOrders(true);
    };

    socket.on("order.ready", handleUpdate);
    socket.on("order.served", handleUpdate);
    socket.on("order.status.changed", handleUpdate);

    return () => {
      socket.off("order.ready", handleUpdate);
      socket.off("order.served", handleUpdate);
      socket.off("order.status.changed", handleUpdate);
    };
  }, []);

  const handlePickup = async (orderId: string) => {
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/waiter/orders/${orderId}/pickup`);
      if (res.data?.success) {
        addToast("Order picked up for delivery!", "success");
        fetchWaiterOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to pickup order.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleMarkServed = async (orderId: string) => {
    try {
      setProcessingAction(true);
      const res = await apiClient.patch(`/waiter/orders/${orderId}/serve`);
      if (res.data?.success) {
        addToast("Order marked SERVED at table!", "success");
        fetchWaiterOrders(true);
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to mark order served.", "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const currentSectionOrders = () => {
    switch (activeTab) {
      case "ready":
        return wdsData.sections.readyOrders;
      case "serving":
        return wdsData.sections.servingOrders;
      case "served":
        return wdsData.sections.servedOrders;
      default:
        return wdsData.sections.readyOrders;
    }
  };

  return (
    <div className="space-y-6">
      {/* Waiter Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 text-white p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <ChefHat className="h-6 w-6 mr-2 text-indigo-400" />
            Waiter Floor Display (WDS)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Table service delivery management. Live sync active (Polling 7s).
          </p>
        </div>
        <Button
          onClick={() => fetchWaiterOrders(false)}
          className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ready for Pickup</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{wdsData.metrics.readyCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Currently Serving</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">{wdsData.metrics.servingCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Served Today</span>
            <div className="text-2xl font-black text-slate-200 mt-1">{wdsData.metrics.servedTodayCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-300 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Delivery</span>
            <div className="text-2xl font-black text-white mt-1">{wdsData.metrics.avgDeliveryMinutes}m</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-300 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 bg-neutral-850 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
        {[
          { id: "ready", label: `Ready for Pickup (${wdsData.sections.readyOrders.length})` },
          { id: "serving", label: `Serving (${wdsData.sections.servingOrders.length})` },
          { id: "served", label: `Served (${wdsData.sections.servedOrders.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-3 text-indigo-400" />
          <span>Loading floor service orders...</span>
        </div>
      ) : currentSectionOrders().length === 0 ? (
        <div className="bg-neutral-850/40 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <ChefHat className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-md font-bold text-white">No orders in this section</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Everything is up to date! New ready orders from the kitchen will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentSectionOrders().map((ord) => (
            <div
              key={ord.id}
              className="bg-neutral-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all shadow-xl"
            >
              <div className="space-y-3">
                {/* Card Top */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                      T-{ord.tableNumber}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">Table {ord.tableNumber}</h4>
                      <p className="text-xs text-slate-400">Order #{ord.orderNumber}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ord.priority === "URGENT" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {ord.elapsedWaitingMinutes}m ready
                  </span>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Items Breakdown</span>
                  {ord.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-slate-200 pt-1 border-t border-slate-850">
                      <div>
                        <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                        <span>{it.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {activeTab === "ready" && (
                  <Button
                    onClick={() => handlePickup(ord.id)}
                    disabled={processingAction}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold cursor-pointer shadow-lg flex items-center justify-center"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Pickup Order
                  </Button>
                )}
                {(activeTab === "serving" || activeTab === "ready") && (
                  <Button
                    onClick={() => handleMarkServed(ord.id)}
                    disabled={processingAction}
                    className={`w-full text-white py-3 rounded-xl text-xs font-bold cursor-pointer shadow-lg flex items-center justify-center ${
                      activeTab === "ready" ? "mt-2 bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Served at Table
                  </Button>
                )}
                {activeTab === "served" && (
                  <div className="text-center text-xs text-emerald-400 font-semibold py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    ✓ Served to Customer
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
