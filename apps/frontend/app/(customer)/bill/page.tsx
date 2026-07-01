"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { getCustomerTableSession } from "../../../lib/api/customer";
import { getSocket } from "../../../lib/socket";
import Link from "next/link";
import {
  Receipt,
  Hash,
  Calendar,
  CreditCard,
  ClipboardList,
  UtensilsCrossed,
  ArrowRight,
  AlertTriangle,
  Lock,
  Layers,
  Clock,
} from "lucide-react";

export default function TableBillPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const sessionId = useCustomerStore((state) => state.sessionId);
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    if (!token) return;
    try {
      const res = await getCustomerTableSession(token);
      if (res.success && res.data) {
        setSession(res.data);
      } else {
        setSession(null);
      }
    } catch (err: any) {
      setError("Failed to retrieve current table session bill.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [token]);

  // Real-time Socket.IO sync for multi-diner shared table billing
  useEffect(() => {
    const activeSessionId = session?.id || sessionId;
    if (!activeSessionId) return;

    const socket = getSocket(activeSessionId);
    socket.emit("join.session", { sessionId: activeSessionId, tableId: table?.id });

    const handleUpdate = () => {
      console.log("[Socket.IO] Real-time table session bill update received");
      fetchSession();
    };

    socket.on("order.created", handleUpdate);
    socket.on("order.status.changed", handleUpdate);
    socket.on("bill.updated", handleUpdate);
    socket.on("payment.completed", handleUpdate);
    socket.on("session.closed", handleUpdate);

    return () => {
      socket.off("order.created", handleUpdate);
      socket.off("order.status.changed", handleUpdate);
      socket.off("bill.updated", handleUpdate);
      socket.off("payment.completed", handleUpdate);
      socket.off("session.closed", handleUpdate);
    };
  }, [session?.id, sessionId, table?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] p-5 space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg" />
        <div className="h-4 w-56 bg-slate-200/60 rounded-lg" />
        <div className="mt-6 space-y-3">
          <div className="h-28 w-full bg-white border border-neutral-100 rounded-3xl" />
          <div className="h-52 w-full bg-white border border-neutral-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "light";

  // Consolidate identical items across all orders in the session
  const consolidatedItemsMap: { [key: string]: { name: string; quantity: number; subtotal: number; unitPrice: number } } = {};
  let subtotal = 0;
  let tax = 0;

  if (session && session.orders) {
    session.orders.forEach((order: any) => {
      // Skip cancelled orders for bill calculations
      if (order.orderStatus === "CANCELLED") return;

      subtotal += Number(order.subtotal);
      tax += Number(order.tax);

      order.orderItems?.forEach((item: any) => {
        const itemKey = item.menuItemId;
        if (consolidatedItemsMap[itemKey]) {
          consolidatedItemsMap[itemKey].quantity += item.quantity;
          consolidatedItemsMap[itemKey].subtotal += Number(item.subtotal);
        } else {
          consolidatedItemsMap[itemKey] = {
            name: item.menuItem?.name || "Menu Item",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal: Number(item.subtotal)
          };
        }
      });
    });
  }

  const consolidatedItems = Object.values(consolidatedItemsMap);
  const grandTotal = subtotal + tax;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-slate-850 tracking-tight">
              Table Bill
            </h1>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Consolidated bill for Table {table?.tableNumber || "—"}
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
            <span className="text-xs text-red-650 font-semibold">{error}</span>
          </div>
        )}

        {/* Empty State */}
        {!session || consolidatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-5 bg-white border border-neutral-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="w-16 h-16 rounded-full bg-[#0f5132]/8 flex items-center justify-center">
              <Receipt className="w-6.5 h-6.5 text-[#0f5132]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-sm text-slate-800">
                No Active Bill
              </h3>
              <p className="text-slate-400 text-xs max-w-[220px] mx-auto leading-relaxed font-semibold">
                There are no active orders placed on this table session yet.
              </p>
            </div>
            <Link
              href={`/menu?token=${token}`}
              className="inline-flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition-all duration-200 active:scale-[0.97] shadow-sm shadow-[#0f5132]/10"
            >
              Go to Menu
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Session Details Card */}
            <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-50 bg-slate-50/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
                  Session Details
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-655" />
                  </span>
                  {session.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-neutral-100">
                {/* Table Number */}
                <div className="bg-white p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0f5132]/8 flex items-center justify-center shrink-0 text-[#0f5132]">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block leading-none">Table</span>
                    <span className="text-xs font-bold text-slate-700">Table {table?.tableNumber}</span>
                  </div>
                </div>
                {/* Session Code */}
                <div className="bg-white p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block leading-none">Session</span>
                    <span className="text-xs font-bold text-slate-700">#{session.sessionNumber.slice(-6)}</span>
                  </div>
                </div>
                {/* Orders Count */}
                <div className="bg-white p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0 text-purple-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block leading-none">Tickets</span>
                    <span className="text-xs font-bold text-slate-700">
                      {session.orders?.filter((o: any) => o.orderStatus !== "CANCELLED").length} Orders
                    </span>
                  </div>
                </div>
                {/* Opened At */}
                <div className="bg-white p-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block leading-none">Time</span>
                    <span className="text-xs font-bold text-slate-700">
                      {new Date(session.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Consolidated Receipt Card */}
            <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              {/* Receipt Header */}
              <div className="px-5 py-4 border-b border-neutral-50 flex items-center gap-2 bg-slate-50/20">
                <Receipt className="w-4 h-4 text-[#0f5132]/60" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
                  Aggregated Items
                </span>
                <span className="text-[9px] text-slate-400 font-bold ml-auto uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                  All Guests
                </span>
              </div>

              {/* Items */}
              <div className="px-5 py-4 space-y-3.5">
                {consolidatedItems.map((item: any, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2.5 max-w-[70%]">
                      <span className="w-6.5 h-6.5 rounded-lg bg-[#0f5132]/6 border border-[#0f5132]/10 flex items-center justify-center text-[10px] font-extrabold text-[#0f5132] shrink-0">
                        {item.quantity}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-700 block truncate">
                          {item.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {item.quantity} × {currency} {item.unitPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-500 tabular-nums">
                      {currency} {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing Summary */}
              <div className="h-px bg-neutral-100" />
              <div className="px-5 py-3 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-semibold text-slate-650">{currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>GST / Tax</span>
                  <span className="tabular-nums font-semibold text-slate-650">{currency} {tax.toFixed(2)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="h-px bg-neutral-100" />
              <div className="px-5 py-4 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#0f5132]" />
                  <span className="text-sm font-black text-slate-800">Grand Total</span>
                </div>
                <span className="text-base font-black text-[#0f5132] tabular-nums">
                  {currency} {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Privacy Disclaimer */}
            <div className="flex items-start gap-3 p-4 bg-[#faf9f6] border border-neutral-200/50 rounded-2xl">
              <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Real-time consolidated table billing. All guest orders scanned under this table QR code are aggregated above. Please handle checkout payment with the cashier.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
