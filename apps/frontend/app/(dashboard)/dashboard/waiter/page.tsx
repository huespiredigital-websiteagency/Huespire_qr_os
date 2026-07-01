"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Utensils,
  Volume2,
  VolumeX,
  BellRing,
  Settings,
  X,
  Info
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { getSocket } from "../../../../lib/socket";
import { soundPlayer, showBrowserNotification, requestNotificationPermission } from "../../../../lib/alert-helper";

interface ToastMsg {
  id: string;
  title: string;
  body: string;
  type: "ready" | "served" | "info";
  time: string;
  isLeaving?: boolean;
}

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

  // Settings Panel state (persisted in local storage)
  const [enableSound, setEnableSound] = useState<boolean>(true);
  const [enableBrowserNotif, setEnableBrowserNotif] = useState<boolean>(false);
  const [enableHighlight, setEnableHighlight] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Autoplay consent banner
  const [audioConsentRequired, setAudioConsentRequired] = useState<boolean>(true);

  // Toasts state
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Prevent sound on initial load / reconnect
  const initialLoadRef = useRef<boolean>(true);
  const existingReadyOrderIds = useRef<Set<string>>(new Set());

  // Load user settings
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSound = localStorage.getItem("wds_enable_sounds");
      const savedNotif = localStorage.getItem("wds_enable_notifications");
      const savedHighlight = localStorage.getItem("wds_auto_highlight");

      if (savedSound !== null) setEnableSound(savedSound === "true");
      if (savedNotif !== null) setEnableBrowserNotif(savedNotif === "true");
      if (savedHighlight !== null) setEnableHighlight(savedHighlight === "true");

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

  const fetchWaiterOrders = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const response = await apiClient.get("/waiter/orders");
      if (response.data?.success) {
        const data = response.data.data;
        setWdsData(data);

        // Store active ready orders to prevent replay sounds on refresh
        if (initialLoadRef.current) {
          const ids = new Set<string>();
          data.sections.readyOrders.forEach((o: any) => ids.add(o.id));
          existingReadyOrderIds.current = ids;
          initialLoadRef.current = false;
        }
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
  }, []);

  // Toast notifier helper
  const triggerToast = (title: string, body: string, type: "ready" | "served" | "info") => {
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

  // Socket event listener
  useEffect(() => {
    const socket = getSocket();

    const handleOrderReady = (payload: any) => {
      // Ensure we don't trigger alerts for known orders
      if (existingReadyOrderIds.current.has(payload.orderId)) {
        fetchWaiterOrders(true);
        return;
      }

      existingReadyOrderIds.current.add(payload.orderId);
      fetchWaiterOrders(true);

      // Play sound
      if (enableSound && !audioConsentRequired) {
        soundPlayer.playWaiterChime();
      }

      // Browser push notification
      if (enableBrowserNotif && document.visibilityState === "hidden") {
        showBrowserNotification(
          "Food Ready for Pickup",
          `Table ${payload.tableNumber || "?"} - Order #${payload.orderNumber || ""}`
        );
      }

      // Dashboard toast
      triggerToast(
        "Ready to Serve",
        `Table ${payload.tableNumber || "?"} - Order #${payload.orderNumber || ""} is ready in kitchen.`,
        "ready"
      );
    };

    const handleUpdate = () => {
      fetchWaiterOrders(true);
    };

    socket.on("order.ready", handleOrderReady);
    socket.on("order.served", handleUpdate);
    socket.on("order.status.changed", handleUpdate);

    return () => {
      socket.off("order.ready", handleOrderReady);
      socket.off("order.served", handleUpdate);
      socket.off("order.status.changed", handleUpdate);
    };
  }, [enableSound, enableBrowserNotif, audioConsentRequired]);

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
        // Remove from local ready set so it doesn't pollute
        existingReadyOrderIds.current.delete(orderId);
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

  const activateAudio = () => {
    soundPlayer.init();
    setAudioConsentRequired(false);
    localStorage.setItem("audio_consent_granted", "true");
  };

  const toggleBrowserNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      setEnableBrowserNotif(granted);
      saveSetting("wds_enable_notifications", granted);
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
      saveSetting("wds_enable_notifications", false);
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
              t.type === "ready"
                ? "border-emerald-500/40 shadow-emerald-950/20"
                : "border-slate-800"
            } text-white rounded-2xl p-4 shadow-xl flex items-start justify-between gap-3 ${
              t.isLeaving ? "animate-slide-out" : "animate-slide-in"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">
                {t.type === "ready" ? "🍽️ Ready to Serve" : "ℹ️ Notification"}
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

      {/* Waiter Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950 text-white p-6 rounded-3xl border border-slate-800 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 blur-3xl rounded-full" />

        <div className="relative z-10">
          <h2 className="text-xl font-bold flex items-center">
            <ChefHat className="h-6 w-6 mr-2 text-indigo-400" />
            Waiter Floor Display (WDS)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Table service delivery management. Live alert sync active.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {/* Settings Panel Toggle */}
          <div className="relative">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              className={`bg-slate-900 border py-2.5 px-3 rounded-xl cursor-pointer flex items-center ${
                showSettings ? "border-amber-500 text-amber-500" : "border-slate-800 text-slate-355 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Settings Dialog */}
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
                        saveSetting("wds_enable_sounds", e.target.checked);
                      }}
                      className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Enable notification sounds</span>
                  </label>

                  {/* Browser Notifications Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={enableBrowserNotif}
                      onChange={(e) => toggleBrowserNotifications(e.target.checked)}
                      className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Enable browser notifications</span>
                  </label>

                  {/* Highlight Ready Toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={enableHighlight}
                      onChange={(e) => {
                        setEnableHighlight(e.target.checked);
                        saveSetting("wds_auto_highlight", e.target.checked);
                      }}
                      className="rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4 bg-slate-950"
                    />
                    <span>Auto-highlight ready tables</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => fetchWaiterOrders(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh Orders
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ready to Serve</span>
            <div className="text-2xl font-black text-emerald-450 mt-1">{wdsData.metrics.readyCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Bell className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Serving / Out</span>
            <div className="text-2xl font-black text-indigo-455 mt-1">{wdsData.metrics.servingCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Served Today</span>
            <div className="text-2xl font-black text-slate-200 mt-1">{wdsData.metrics.servedTodayCount}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-350 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#141414] border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Delivery</span>
            <div className="text-2xl font-black text-white mt-1">{wdsData.metrics.avgDeliveryMinutes}m</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-700/30 text-slate-350 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-1.5 pb-px">
        <button
          onClick={() => setActiveTab("ready")}
          className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "ready" ? "text-emerald-450 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Ready to Serve ({wdsData.sections.readyOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("serving")}
          className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "serving" ? "text-indigo-455 border-b-2 border-indigo-500" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Serving / Active ({wdsData.sections.servingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("served")}
          className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "served" ? "text-slate-300 border-b-2 border-slate-650" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Served Logs ({wdsData.sections.servedOrders.length})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentSectionOrders().length === 0 ? (
          <div className="col-span-full bg-slate-900/30 border border-slate-800/80 rounded-3xl p-16 text-center text-slate-600 text-sm font-semibold">
            No orders in this status column
          </div>
        ) : (
          currentSectionOrders().map((ord) => {
            const isReady = ord.orderStatus === "READY";
            const highlightCard = isReady && enableHighlight;

            return (
              <div
                key={ord.id}
                className={`bg-slate-950 border rounded-3xl p-5 space-y-4 shadow-lg transition-all duration-300 animate-scale-in ${
                  highlightCard
                    ? "border-emerald-500/60 animate-glow-pulse-green"
                    : "border-slate-800"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <span className={`text-white text-xs font-black px-2.5 py-1 rounded-xl ${isReady ? "bg-emerald-600" : "bg-indigo-650"}`}>
                      Table {ord.tableNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">#{ord.orderNumber}</span>
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-slate-500 space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{ord.elapsedMinutes}m elapsed</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 text-xs">
                  {ord.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/40">
                      <div>
                        <span className="font-extrabold text-white mr-1.5">{it.quantity}x</span>
                        <span className="text-slate-350">{it.name}</span>
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
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] p-2.5 rounded-xl flex items-start space-x-1.5">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{ord.specialInstructions}</span>
                  </div>
                )}

                {/* Action button */}
                {activeTab === "ready" && (
                  <Button
                    onClick={() => handlePickup(ord.id)}
                    disabled={processingAction}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all duration-200 active:scale-[0.97]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Pickup from Kitchen
                  </Button>
                )}

                {activeTab === "serving" && (
                  <Button
                    onClick={() => handleMarkServed(ord.id)}
                    disabled={processingAction}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all duration-200 active:scale-[0.97]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Served
                  </Button>
                )}

                {activeTab === "served" && (
                  <div className="flex items-center justify-between text-[11px] text-slate-550 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Served by Waiter
                    </span>
                    <span className="font-semibold">{ord.servedAtTime || "Completed"}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
