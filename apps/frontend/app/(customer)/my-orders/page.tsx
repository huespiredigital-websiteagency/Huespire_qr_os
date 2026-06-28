"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { getCustomerOrder } from "../../../lib/api/customer";
import Link from "next/link";

export default function MyOrdersPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { orderIds, restaurant } = useCustomerStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchAllOrders = async () => {
      try {
        setLoading(true);
        const fetched = await Promise.all(
          orderIds.map(async (id) => {
            try {
              const res = await getCustomerOrder(id);
              return res.success ? res.data : null;
            } catch (err) {
              console.error(`Failed to load order ${id}`, err);
              return null;
            }
          })
        );
        // Filter out nulls and sort by date descending
        const validOrders = fetched
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setOrders(validOrders);
      } catch (err: any) {
        setError("Failed to load your orders history.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, [orderIds]);

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

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
        <h1 className="text-2xl font-black">My Orders</h1>
        <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
          Orders placed from this device during your current dining session.
        </p>
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
            <h3 className="font-extrabold text-sm text-neutral-300">No Orders Yet</h3>
            <p className="text-neutral-500 text-xs max-w-[200px] mx-auto leading-normal">
              You haven't placed any orders in this session.
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
          {orders.map((order) => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
            const status = order.orderStatus;
            
            return (
              <div
                key={order.id}
                className={`p-5 rounded-3xl border space-y-3.5 transition-all ${
                  isDark ? "bg-neutral-900/50 border-neutral-800 hover:border-neutral-750" : "bg-white border-neutral-100 hover:shadow-sm"
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="font-black text-neutral-200">{order.orderNumber}</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">{timeStr}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${
                    status === "PENDING" && "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                  } ${
                    status === "ACCEPTED" && "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                  } ${
                    status === "PREPARING" && "bg-purple-500/10 text-purple-400 border border-purple-500/10 animate-pulse"
                  } ${
                    status === "READY" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                  } ${
                    status === "SERVED" && "bg-neutral-800 text-neutral-400 border border-neutral-750"
                  } ${
                    status === "COMPLETED" && "bg-neutral-800 text-neutral-400 border border-neutral-750"
                  } ${
                    status === "CANCELLED" && "bg-red-500/10 text-red-500 border border-red-500/10"
                  }`}>
                    {status}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5 text-xs text-neutral-400">
                  {order.orderItems?.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.menuItem?.name}</span>
                      <span className="font-semibold">{currency} {Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-neutral-800/15 dark:border-neutral-800 pt-3 flex justify-between items-center text-xs">
                  <Link
                    href={`/order-tracking/${order.id}?token=${token}`}
                    className="text-amber-500 font-bold hover:underline"
                  >
                    Track Progress →
                  </Link>
                  <span className="font-black text-neutral-200">
                    {currency} {Number(order.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
