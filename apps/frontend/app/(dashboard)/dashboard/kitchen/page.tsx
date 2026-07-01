"use client";

import React, { useState, useEffect, useRef } from "react";
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
  MessageSquare,
  Volume2,
  VolumeX,
  BellRing,
  Settings,
  X,
  Info,
  ChevronDown
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { getSocket } from "../../../../lib/socket";
import { soundPlayer, showBrowserNotification, requestNotificationPermission } from "../../../../lib/alert-helper";

interface ToastMsg {
  id: string;
  title: string;
  body: string;
  type: "new" | "additional" | "info";
  time: string;
  isLeaving?: boolean;
}

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

  // Settings Panel state (persisted in local storage)
  const [enableSound, setEnableSound] = useState<boolean>(true);
  const [enableBrowserNotif, setEnableBrowserNotif] = useState<boolean>(false);
  const [enableAutoScroll, setEnableAutoScroll] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Autoplay consent banner
  const [audioConsentRequired, setAudioConsentRequired] = useState<boolean>(true);

  // Toasts state
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Prevent sound on initial load / reconnect
  const initialLoadRef = useRef<boolean>(true);
  const existingOrderIds = useRef<Set<string>>(new Set());
  const newOrderColumnRef = useRef<HTMLDivElement>(null);
  const newOrdersCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load user settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSound = localStorage.getItem("kds_enable_sounds");
      const savedNotif = localStorage.getItem("kds_enable_notifications");
      const savedScroll = localStorage.getItem("kds_auto_scroll");

      if (savedSound !== null) setEnableSound(savedSound === "true");
      if (savedNotif !== null) setEnableBrowserNotif(savedNotif === "true");
      if (savedScroll !== null) setEnableAutoScroll(savedScroll === "true");

      const consent = localStorage.getItem("audio_consent_granted") === "true";
      if (consent) {
        setAudioConsentRequired(false);
        soundPlayer.init();
      }

      // Automatically register SW and subscribe to Push if notifications are enabled
      if (Notification.permission === "granted" && savedNotif === "true") {
        import("../../../../lib/alert-helper").then(({ subscribeUserToPush }) => {
          subscribeUserToPush();
        });
      }
    }
  }, []);

  const saveSetting = (key: string, value: boolean) => {
    localStorage.setItem(key, String(value));
  };

  const fetchKitchenOrders = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (sortBy) params.append("sortBy", sortBy);
      if (tableFilter) params.append("tableId", tableFilter);

      const response = await apiClient.get(`/kitchen/orders?${params.toString()}`);
      if (response.data?.success) {
        const data = response.data.data;
        setKdsData(data);

        // Store active order IDs to prevent replay sounds on page refresh / load
        if (initialLoadRef.current) {
          const ids = new Set<string>();
          data.columns.newOrders.forEach((o: any) => ids.add(o.id));
          data.columns.preparingOrders.forEach((o: any) => ids.add(o.id));
          data.columns.readyOrders.forEach((o: any) => ids.add(o.id));
          existingOrderIds.current = ids;
          initialLoadRef.current = false;
        }
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
  }, [sortBy, tableFilter]);

  // Push custom toast notification helper
  const triggerToast = (title: string, body: string, type: "new" | "additional" | "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, body, type, time: "Just Now" }]);
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isLeaving: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 350);
    }, 6000);
  };

  // Real-time socket event handling
  useEffect(() => {
    const socket = getSocket();

    const handleNewOrder = (order: any) => {
      // Ensure we don't trigger alerts for known orders
      if (existingOrderIds.current.has(order.id)) {
        fetchKitchenOrders(true);
        return;
      }

      existingOrderIds.current.add(order.id);
      fetchKitchenOrders(true);

      // Play Sound
      if (enableSound && !audioConsentRequired) {
        soundPlayer.playKitchenBeep();
      }

      // Show Native browser notification if page is hidden
      if (enableBrowserNotif && document.visibilityState === "hidden") {
        const title = order.isAdditional ? "Additional Items Added" : "New Order Received";
        const body = `Table ${order.table?.tableNumber || "?"} - ${order.orderItems?.length || 1} items`;
        showBrowserNotification(title, body);
      }

      // Show custom toast notification
      if (order.isAdditional) {
        triggerToast(
          `Table ${order.table?.tableNumber || "?"} added items`,
          `${order.orderItems?.length || 1} additional item(s) placed.`,
          "additional"
        );
      } else {
        triggerToast(
          `New Order - Table ${order.table?.tableNumber || "?"}`,
          `Order #${order.orderNumber} placed.`,
          "new"
        );
      }

      // Auto scroll to New Orders column
      if (enableAutoScroll && newOrderColumnRef.current) {
        setTimeout(() => {
          newOrderColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
      }
    };

    const handleUpdate = () => {
      fetchKitchenOrders(true);
    };

    socket.on("order.created", handleNewOrder);
    socket.on("new.order", handleNewOrder);
    socket.on("order.accepted", handleUpdate);
    socket.on("order.preparing", handleUpdate);
    socket.on("order.ready", handleUpdate);
    socket.on("order.cancelled", handleUpdate);

    return () => {
      socket.off("order.created", handleNewOrder);
      socket.off("new.order", handleNewOrder);
      socket.off("order.accepted", handleUpdate);
      socket.off("order.preparing", handleUpdate);
      socket.off("order.ready", handleUpdate);
      socket.off("order.cancelled", handleUpdate);
    };
  }, [enableSound, enableBrowserNotif, enableAutoScroll, audioConsentRequired]);

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

  const activateAudio = () => {
    soundPlayer.init();
    setAudioConsentRequired(false);
    localStorage.setItem("audio_consent_granted", "true");
  };

  const toggleBrowserNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      setEnableBrowserNotif(granted);
      saveSetting("kds_enable_notifications", granted);
      if (granted) {
        addToast("Browser notifications enabled successfully!", "success");
        import("../../../../lib/alert-helper").then(({ subscribeUserToPush }) => {
          subscribeUserToPush();
        });
      } else {
        addToast("Browser notifications permission denied.", "error");
      }
    } else {
      setEnableBrowserNotif(false);
      saveSetting("kds_enable_notifications", false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-80 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-slate-900 border ${
              t.type === "new"
                ? "border-amber-500/40 shadow-amber-950/20"
                : t.type === "additional"
                ? "border-indigo-500/40 shadow-indigo-950/20"
                : "border-slate-800"
            } text-white rounded-2xl p-4 shadow-xl flex items-start justify-between gap-3 ${
              t.isLeaving ? "animate-slide-out" : "animate-slide-in"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">
                {t.type === "new" ? "🔔 New Order" : t.type === "additional" ? "⚡ Additional Items" : "ℹ️ Notification"}
              </span>
              <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{t.body}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Autoplay Consent Banner */}
      {audioConsentRequired && (
        <div className="bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-fade-up">
          <div className="flex items-center space-x-2">
            <VolumeX className="h-4.5 w-4.5 animate-bounce" />
            <span>Sounds are muted until you click to activate system audio alerts.</span>
          </div>
          <Button
            onClick={activateAudio}
            className="bg-slate-950 text-white hover:bg-slate-900 px-4 py-1.5 h-auto text-[11px] font-black rounded-lg cursor-pointer transition-all active:scale-[0.97]"
          >
            Enable Audio Alerts
          </Button>
        </div>
      )}

      {/* KDS Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-orange-500/5 blur-3xl rounded-full" />

        <div className="relative z-10">
          <h2 className="text-xl font-bold flex items-center">
            <Flame className="h-6 w-6 mr-2 text-orange-500 animate-pulse" />
            Kitchen Display System (KDS)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time order cooking workflow. Live alert sync active.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {/* Settings Toggle Button */}
          <div className="relative">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              className={`bg-slate-900 border py-2.5 px-3 rounded-xl cursor-pointer flex items-center ${
                showSettings ? "border-amber-500 text-amber-500" : "border-slate-800 text-slate-350 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Settings Dropdown Box */}
            {showSettings && (
              <div className="absolute right-0 mt-2.5 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl z-30 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-200">Alert Settings</h4>
                  <button onClick={() => setShowSettings(false)}>
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <div className="space-y-3">
                  {/* Sound Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={enableSound}
                      onChange={(e) => {
                        setEnableSound(e.target.checked);
                        saveSetting("kds_enable_sounds", e.target.checked);
                      }}
                      className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Enable notification sounds</span>
                  </label>

                  {/* Browser Notifications Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={enableBrowserNotif}
                      onChange={(e) => toggleBrowserNotifications(e.target.checked)}
                      className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Enable browser notifications</span>
                  </label>

                  {/* Auto Scroll Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={enableAutoScroll}
                      onChange={(e) => {
                        setEnableAutoScroll(e.target.checked);
                        saveSetting("kds_auto_scroll", e.target.checked);
                      }}
                      className="rounded border-slate-800 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Auto-scroll to new orders</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => fetchKitchenOrders(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? "animate-spin text-orange-400" : ""}`} />
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">New Orders</span>
            <div className="text-2xl font-black text-amber-405 mt-1">{kdsData.metrics.newOrdersCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Preparing</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">{kdsData.metrics.preparingCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Flame className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ready for Pickup</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{kdsData.metrics.readyCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Prep Time</span>
            <div className="text-2xl font-black text-white mt-1">{kdsData.metrics.avgPrepTimeMinutes}m</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-350 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Orders Today</span>
            <div className="text-2xl font-black text-slate-200 mt-1">{kdsData.metrics.ordersTodayCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-350 flex items-center justify-center">
            <Utensils className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-405 uppercase tracking-wider">
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
        <div
          ref={newOrderColumnRef}
          className="bg-slate-900/30 rounded-3xl p-4 border border-slate-800/80 flex flex-col space-y-4 min-h-[600px] scroll-mt-24"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-amber-400 flex items-center uppercase tracking-wider">
              <Clock className="h-4 w-4 mr-2 animate-spin-slow" />
              New Orders ({kdsData.columns.newOrders.length})
            </h3>
            {kdsData.columns.newOrders.length > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping"></span>
            )}
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[650px] scrollbar-none">
            {kdsData.columns.newOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No pending orders</div>
            ) : (
              kdsData.columns.newOrders.map((ord) => {
                const isAdditional = ord.isAdditional;
                return (
                  <div
                    key={ord.id}
                    ref={(el) => {
                      newOrdersCardRefs.current[ord.id] = el;
                    }}
                    className={`bg-slate-950 border rounded-2xl p-4 space-y-3 shadow-lg transition-all duration-300 animate-scale-in ${
                      isAdditional
                        ? "border-indigo-500/60 animate-glow-pulse"
                        : "border-amber-500/50 animate-glow-pulse"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-indigo-650 text-white text-xs font-black px-2.5 py-1 rounded-lg">
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

                    {isAdditional && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Additional order added to active session</span>
                      </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-2 text-xs">
                      {ord.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start bg-slate-900/60 p-2 rounded-xl border border-slate-800/40">
                          <div>
                            <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                            <span className="text-slate-200">{it.name}</span>
                            {it.variants && it.variants.length > 0 && (
                              <div className="text-[10px] text-indigo-400 font-medium">({it.variants.join(", ")})</div>
                            )}
                            {it.addons && it.addons.length > 0 && (
                              <div className="text-[10px] text-emerald-400 font-medium">+ {it.addons.join(", ")}</div>
                            )}
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
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="bg-slate-900/30 rounded-3xl p-4 border border-slate-800/80 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-indigo-400 flex items-center uppercase tracking-wider">
              <Flame className="h-4 w-4 mr-2 text-indigo-405 animate-pulse" />
              Preparing ({kdsData.columns.preparingOrders.length})
            </h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[650px] scrollbar-none">
            {kdsData.columns.preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No orders currently cooking</div>
            ) : (
              kdsData.columns.preparingOrders.map((ord) => (
                <div key={ord.id} className="bg-slate-950 border border-indigo-500/20 rounded-2xl p-4 space-y-3 shadow-lg">
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
                      <div key={idx} className="flex justify-between items-start bg-slate-900/60 p-2 rounded-xl border border-slate-800/40">
                        <div>
                          <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                          <span className="text-slate-200">{it.name}</span>
                          {it.variants && it.variants.length > 0 && (
                            <div className="text-[10px] text-indigo-400 font-medium">({it.variants.join(", ")})</div>
                          )}
                          {it.addons && it.addons.length > 0 && (
                            <div className="text-[10px] text-emerald-400 font-medium">+ {it.addons.join(", ")}</div>
                          )}
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Ready for Pickup
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR PICKUP */}
        <div className="bg-slate-900/30 rounded-3xl p-4 border border-slate-800/80 flex flex-col space-y-4 min-h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Ready ({kdsData.columns.readyOrders.length})
            </h3>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[650px] scrollbar-none">
            {kdsData.columns.readyOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-medium">No orders waiting for pickup</div>
            ) : (
              kdsData.columns.readyOrders.map((ord) => (
                <div key={ord.id} className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 space-y-3 shadow-lg opacity-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        T-{ord.tableNumber}
                      </span>
                      <span className="text-xs font-bold text-white font-mono">{ord.orderNumber}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 animate-pulse">
                      Waiting Waiter
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
