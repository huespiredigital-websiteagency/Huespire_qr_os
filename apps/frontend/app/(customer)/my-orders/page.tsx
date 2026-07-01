"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { getCustomerTableSession } from "../../../lib/api/customer";
import { getSocket } from "../../../lib/socket";
import Link from "next/link";
import {
  ClipboardList,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  Bell,
  AlertTriangle,
  Hash,
  ArrowRight,
} from "lucide-react";

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const sessionId = useCustomerStore((state) => state.sessionId);

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionOrders = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await getCustomerTableSession(token);
      if (res.success && res.data) {
        setSession(res.data);
      } else {
        setSession(null);
      }
    } catch (err: any) {
      setError("Failed to load table orders history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionOrders();
  }, [token]);

  // Real-time Socket.IO sync for table orders history
  useEffect(() => {
    const activeSessionId = session?.id || sessionId;
    if (!activeSessionId) return;

    const socket = getSocket(activeSessionId);
    socket.emit("join.session", { sessionId: activeSessionId, tableId: table?.id });

    const handleUpdate = () => {
      console.log("[Socket.IO] Real-time table orders update received");
      fetchSessionOrders();
    };

    socket.on("order.created", handleUpdate);
    socket.on("order.status.changed", handleUpdate);
    socket.on("order.accepted", handleUpdate);
    socket.on("order.preparing", handleUpdate);
    socket.on("order.ready", handleUpdate);
    socket.on("order.served", handleUpdate);
    socket.on("order.cancelled", handleUpdate);

    return () => {
      socket.off("order.created", handleUpdate);
      socket.off("order.status.changed", handleUpdate);
      socket.off("order.accepted", handleUpdate);
      socket.off("order.preparing", handleUpdate);
      socket.off("order.ready", handleUpdate);
      socket.off("order.served", handleUpdate);
      socket.off("order.cancelled", handleUpdate);
    };
  }, [session?.id, sessionId, table?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] p-5 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg" />
        <div className="h-4 w-64 bg-slate-200/60 rounded-lg" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 w-full bg-white border border-neutral-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "light";

  const orders = session?.orders
    ? [...session.orders].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          icon: <Clock className="w-3 h-3" />,
          label: "Kitchen Sent",
          bgClass: "bg-amber-50 text-amber-700 border-amber-100",
          accentBorder: "border-l-amber-500",
          animate: "",
        };
      case "ACCEPTED":
      case "PREPARING":
        return {
          icon: <ChefHat className="w-3 h-3" />,
          label: "Preparing",
          bgClass: "bg-blue-50 text-blue-700 border-blue-100",
          accentBorder: "border-l-blue-500",
          animate: "animate-pulse",
        };
      case "READY":
        return {
          icon: <Bell className="w-3 h-3" />,
          label: "Ready!",
          bgClass: "bg-emerald-50 text-emerald-850 border-emerald-100",
          accentBorder: "border-l-emerald-500",
          animate: "",
        };
      case "SERVED":
        return {
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: "Served",
          bgClass: "bg-slate-50 text-slate-500 border-neutral-200",
          accentBorder: "border-l-slate-400",
          animate: "",
        };
      case "CANCELLED":
        return {
          icon: <XCircle className="w-3 h-3" />,
          label: "Cancelled",
          bgClass: "bg-red-50 text-red-700 border-red-100",
          accentBorder: "border-l-red-500",
          animate: "",
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          label: status,
          bgClass: "bg-slate-50 text-slate-500 border-neutral-200",
          accentBorder: "border-l-slate-400",
          animate: "",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-slate-850 tracking-tight">
              Table Orders
            </h1>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Real-time updates for Table {table?.tableNumber || "—"}
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span className="text-[9px] font-extrabold text-[#0f5132] uppercase tracking-wider">
              Live Sync
            </span>
          </div>
        </div>
        <div className="mt-4 h-px bg-neutral-100" />
      </div>

      <div className="px-4 pb-8 space-y-4 animate-fade-up">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-600 font-semibold">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-5 bg-white border border-neutral-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="w-16 h-16 rounded-full bg-[#0f5132]/8 flex items-center justify-center">
              <ClipboardList className="w-6.5 h-6.5 text-[#0f5132]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-sm text-slate-800">
                No Orders Placed Yet
              </h3>
              <p className="text-slate-400 text-xs max-w-[220px] mx-auto leading-relaxed font-semibold">
                No orders have been submitted for Table {table?.tableNumber || "this session"}.
              </p>
            </div>
            <Link
              href={`/menu?token=${token}`}
              className="inline-flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition-all duration-200 active:scale-[0.97] shadow-sm shadow-[#0f5132]/10"
            >
              Start Ordering
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            {orders.map((order: any) => {
              const config = getStatusConfig(order.orderStatus);
              return (
                <div
                  key={order.id}
                  className={`bg-white border border-neutral-100 rounded-[22px] overflow-hidden border-l-[3.5px] ${config.accentBorder} transition-all duration-200 shadow-[0_6px_20px_rgba(0,0,0,0.01)] hover:border-neutral-200`}
                >
                  {/* Order Header */}
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between bg-slate-50/20">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Hash className="w-3.5 h-3.5 text-[#0f5132]/50" />
                        <span className="font-bold text-sm">{order.orderNumber}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] font-extrabold uppercase tracking-wider ${config.bgClass} ${config.animate}`}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-neutral-100" />

                  {/* Items List */}
                  <div className="px-4 py-3 space-y-2">
                    {order.orderItems?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="w-5 h-5 rounded-md bg-[#0f5132]/6 border border-[#0f5132]/10 flex items-center justify-center text-[10px] font-extrabold text-[#0f5132]">
                            {item.quantity}
                          </span>
                          <span className="font-semibold">
                            {item.menuItem?.name || "Item"}
                          </span>
                        </div>
                        <span className="text-slate-400 font-bold tabular-nums">
                          {currency} {Number(item.subtotal).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="h-px bg-neutral-100" />
                  <div className="px-4 py-3 flex justify-between items-center bg-slate-50/30">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Ticket Total
                    </span>
                    <span className="text-sm font-black text-[#0f5132] tabular-nums">
                      {currency} {Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
