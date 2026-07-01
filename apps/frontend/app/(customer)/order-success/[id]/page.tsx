"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getCustomerOrder } from "../../../../lib/api/customer";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  Clock,
  Hash,
  Receipt,
  UtensilsCrossed,
  Eye,
  Loader2,
  AlertTriangle,
  Timer,
  CreditCard,
} from "lucide-react";

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
      <div className="min-h-screen bg-[#faf9f6] p-5 space-y-6 animate-pulse">
        <div className="flex flex-col items-center py-16 space-y-5">
          <div className="w-20 h-20 bg-slate-200/60 rounded-full" />
          <div className="space-y-2.5 flex flex-col items-center">
            <div className="h-6 w-48 bg-slate-200/60 rounded-xl" />
            <div className="h-4 w-36 bg-slate-200/60 rounded-lg" />
          </div>
        </div>
        <div className="h-44 w-full bg-white border border-neutral-100 rounded-3xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center space-y-5 text-slate-800 font-sans">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
          <p className="text-sm text-slate-400 max-w-[280px]">
            {error || "Could not retrieve order success details."}
          </p>
        </div>
        <Link
          href={`/menu?token=${token || ""}`}
          className="inline-flex items-center gap-2 bg-[#0f5132] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 active:scale-[0.97]"
        >
          <UtensilsCrossed className="w-4 h-4" />
          Go back to Menu
        </Link>
      </div>
    );
  }

  const currency = order.restaurant?.currency || "INR";
  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-10">
      <div className="p-4 space-y-5 animate-fade-up">

        {/* Success Banner & Header */}
        <div className="flex flex-col items-center text-center pt-8 pb-4 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 bg-emerald-500/8 border border-emerald-500/20 rounded-full flex items-center justify-center animate-[scale-in_0.5s_ease-out]">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" strokeWidth={2} />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-850 tracking-tight">Order Confirmed!</h1>
            <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed font-semibold">
              The kitchen has received your order and is preparing it.
            </p>
          </div>
        </div>

        {/* Overview Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-[0_6px_25px_rgba(0,0,0,0.015)]">
          {/* Card Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50 bg-slate-50/10">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Order Summary
            </span>
            <span className="text-[10px] font-extrabold text-[#0f5132] bg-[#0f5132]/6 px-3 py-1 rounded-full border border-[#0f5132]/10 uppercase tracking-wider">
              {order.orderNumber}
            </span>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-2 gap-px bg-neutral-100">
            {/* Table */}
            <div className="bg-white p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#0f5132]/50" />
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Table</span>
              </div>
              <span className="text-sm font-bold text-slate-700">
                Table {order.table?.tableNumber}
              </span>
            </div>

            {/* Time */}
            <div className="bg-white p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0f5132]/50" />
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Time</span>
              </div>
              <span className="text-sm font-bold text-slate-700">{formattedTime}</span>
            </div>

            {/* Wait Time */}
            <div className="bg-white p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-[#0f5132]/50" />
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Wait Time</span>
              </div>
              <span className="text-sm font-bold text-[#0f5132]">~ 15-20 Mins</span>
            </div>

            {/* Bill Status */}
            <div className="bg-white p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#0f5132]/50" />
                <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">Bill</span>
              </div>
              <span className="text-sm font-bold text-slate-650">Unpaid</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100 bg-slate-55/10">
            <span className="text-xs text-slate-400 font-bold">Grand Total</span>
            <span className="text-base font-black text-[#0f5132] tabular-nums">
              {currency} {Number(order.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Primary: Track Order */}
          <Link
            href={`/order-tracking/${order.id}?token=${token}`}
            className="w-full h-[52px] bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] shadow-sm shadow-[#0f5132]/10"
          >
            <Eye className="w-4.5 h-4.5" />
            Track Order Progress
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Secondary: Continue Ordering */}
          <Link
            href={`/menu?token=${token}`}
            className="w-full h-[52px] bg-white border border-neutral-200 text-slate-600 hover:bg-slate-50 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
          >
            <UtensilsCrossed className="w-4 h-4 text-slate-400" />
            Continue Ordering
          </Link>

          {/* Tertiary: View Bill */}
          <Link
            href={`/bill?token=${token}`}
            className="w-full h-[48px] bg-transparent hover:bg-slate-50 text-slate-400 hover:text-[#0f5132] font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
          >
            <Receipt className="w-3.5 h-3.5" />
            View Table Combined Bill
          </Link>
        </div>
      </div>
    </div>
  );
}
