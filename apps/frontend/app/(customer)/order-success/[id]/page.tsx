"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getCustomerOrder } from "../../../../lib/api/customer";
import Link from "next/link";

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const token = searchParams.get("token");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await getCustomerOrder(id);
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError("Order details not found.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load order.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex flex-col items-center py-10 space-y-4">
          <div className="w-20 h-20 bg-neutral-850 rounded-full"></div>
          <div className="h-6 w-1/2 bg-neutral-850 rounded"></div>
          <div className="h-4 w-1/3 bg-neutral-850 rounded"></div>
        </div>
        <div className="h-40 w-full bg-neutral-850 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center space-y-4">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-bold text-red-500">Something went wrong</h2>
        <p className="text-sm text-neutral-400">{error || "Could not retrieve order success details."}</p>
        <Link
          href={`/menu?token=${token || ""}`}
          className="inline-block bg-amber-500 text-neutral-950 font-bold px-6 py-2.5 rounded-xl text-sm"
        >
          Go back to Menu
        </Link>
      </div>
    );
  }

  const isDark = order.restaurant?.settings?.theme !== "light";
  const currency = order.restaurant?.currency || "INR";
  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="p-6 space-y-6">
      {/* Success Animation & Header */}
      <div className="flex flex-col items-center text-center py-6 space-y-4 relative">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 text-4xl animate-bounce">
          ✓
        </div>
        
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white">Order Confirmed!</h1>
          <p className="text-xs text-neutral-400 max-w-[260px] mx-auto leading-relaxed">
            Your order has been placed successfully. The kitchen has received your order.
          </p>
        </div>
      </div>

      {/* Overview Card */}
      <div className={`p-5 rounded-3xl border space-y-4 ${
        isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
      }`}>
        <div className="flex justify-between items-center text-xs border-b border-neutral-800/10 dark:border-neutral-800 pb-3">
          <span className="text-neutral-500 font-semibold uppercase tracking-wider">Order Summary</span>
          <span className="font-extrabold text-amber-500">{order.orderNumber}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-neutral-500 block mb-0.5">Table</span>
            <span className="font-bold text-neutral-200">Table {order.table?.tableNumber}</span>
          </div>
          <div>
            <span className="text-neutral-500 block mb-0.5">Time</span>
            <span className="font-bold text-neutral-200">{formattedTime}</span>
          </div>
          <div>
            <span className="text-neutral-500 block mb-0.5">Wait Time</span>
            <span className="font-bold text-amber-500">~ 15-20 Mins</span>
          </div>
          <div>
            <span className="text-neutral-500 block mb-0.5">Bill Status</span>
            <span className="font-bold text-emerald-400">UNPAID (Open Session)</span>
          </div>
        </div>

        <div className="border-t border-neutral-800/10 dark:border-neutral-800 pt-3 flex justify-between items-center text-xs">
          <span className="text-neutral-400">Grand Total</span>
          <span className="text-base font-black text-amber-500">{currency} {Number(order.totalAmount).toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <Link
          href={`/order-tracking/${order.id}?token=${token}`}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-2xl text-sm block text-center transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-amber-500/5"
        >
          Track Order Progress
        </Link>
        
        <Link
          href={`/menu?token=${token}`}
          className="w-full py-4 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 font-bold rounded-2xl text-sm block text-center border border-neutral-750/30 transition-all hover:scale-[1.01] active:scale-95"
        >
          Continue Ordering Items
        </Link>

        <Link
          href={`/bill?token=${token}`}
          className="w-full py-4 bg-neutral-900/40 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-300 font-semibold rounded-2xl text-xs block text-center transition-all"
        >
          View Current Combined Bill
        </Link>
      </div>
    </div>
  );
}
