"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { getCustomerTableSession } from "../../../lib/api/customer";
import { getSocket } from "../../../lib/socket";
import Link from "next/link";

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
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-7 w-1/3 bg-neutral-850 rounded"></div>
        <div className="h-32 w-full bg-neutral-850 rounded-3xl"></div>
        <div className="h-32 w-full bg-neutral-850 rounded-3xl"></div>
      </div>
    );
  }

  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

  const orders = session?.orders
    ? [...session.orders].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold">⏳ Sent to Kitchen</span>;
      case "ACCEPTED":
      case "PREPARING":
        return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-bold animate-pulse">🍳 Preparing</span>;
      case "READY":
        return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold animate-bounce">🔔 Ready for Pickup</span>;
      case "SERVED":
        return <span className="px-2.5 py-1 bg-neutral-800 text-neutral-400 border border-neutral-700/30 rounded-full text-[10px] font-bold">✨ Served</span>;
      case "CANCELLED":
        return <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-bold">❌ Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 bg-neutral-800 text-neutral-400 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-neutral-800/10 dark:border-neutral-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black">Table Orders</h1>
          <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
            Real-time tracking of all orders placed at your table session.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs">
          ⚠️ {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 space-y-5">
          <div className="text-5xl">🍽️</div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-neutral-300">No Orders Placed Yet</h3>
            <p className="text-neutral-500 text-xs max-w-[200px] mx-auto leading-normal">
              No orders have been submitted for Table {table?.tableNumber || "this session"}.
            </p>
          </div>
          <Link
            href={`/menu?token=${token}`}
            className="inline-block bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-6 py-3 rounded-xl text-xs transition-all hover:scale-[1.01]"
          >
            Start Ordering
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`p-5 rounded-3xl border space-y-3 ${
                isDark ? "bg-neutral-900/40 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-800/10 dark:border-neutral-800 pb-3">
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-neutral-200">{order.orderNumber}</span>
                  <span className="text-[10px] text-neutral-500">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {getStatusBadge(order.orderStatus)}
              </div>

              {/* Items List */}
              <div className="space-y-2 py-1">
                {order.orderItems?.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-neutral-300 font-medium">
                      {item.quantity}x {item.menuItem?.name || "Item"}
                    </span>
                    <span className="text-neutral-400 font-semibold">
                      {currency} {Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-800/10 dark:border-neutral-800 pt-3 flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-semibold">Ticket Total</span>
                <span className="font-black text-amber-500">{currency} {Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
