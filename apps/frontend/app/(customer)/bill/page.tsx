"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { getCustomerTableSession } from "../../../lib/api/customer";
import Link from "next/link";

export default function TableBillPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchSession = async () => {
      try {
        setLoading(true);
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

    fetchSession();
  }, [token]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-7 w-1/3 bg-neutral-850 rounded"></div>
        <div className="h-20 w-full bg-neutral-850 rounded-3xl"></div>
        <div className="h-44 w-full bg-neutral-850 rounded-3xl"></div>
      </div>
    );
  }

  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

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
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
        <h1 className="text-2xl font-black">Table Bill</h1>
        <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
          Consolidated open bill details for your entire table.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs">
          ⚠️ {error}
        </div>
      )}

      {!session || consolidatedItems.length === 0 ? (
        <div className="text-center py-16 space-y-5">
          <div className="text-5xl">🧾</div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-neutral-300">No Active Bill</h3>
            <p className="text-neutral-500 text-xs max-w-[200px] mx-auto leading-normal">
              There are no orders placed on this table session yet.
            </p>
          </div>
          <Link
            href={`/menu?token=${token}`}
            className="inline-block bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-6 py-3 rounded-xl text-xs transition-all"
          >
            Go to Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Table Session Details Card */}
          <div className={`p-5 rounded-3xl border space-y-3 ${
            isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
          }`}>
            <div className="flex justify-between items-center text-xs border-b border-neutral-800/10 dark:border-neutral-800 pb-3">
              <span className="text-neutral-500 font-semibold uppercase tracking-wider">Session Details</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {session.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-neutral-500 block mb-0.5">Table No.</span>
                <span className="font-bold text-neutral-200">Table {table?.tableNumber}</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5">Session Code</span>
                <span className="font-bold text-neutral-200">{session.sessionNumber}</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5">Orders Placed</span>
                <span className="font-bold text-neutral-200">{session.orders?.filter((o: any) => o.orderStatus !== "CANCELLED").length} Tickets</span>
              </div>
              <div>
                <span className="text-neutral-500 block mb-0.5">Opened At</span>
                <span className="font-bold text-neutral-200">
                  {new Date(session.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          {/* Consolidated Receipt Invoice Card */}
          <div className={`p-5 rounded-3xl border space-y-4 relative ${
            isDark ? "bg-neutral-900/30 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800/10 dark:border-neutral-800 pb-2">
              Aggregated Items (All Guests)
            </h3>

            <div className="space-y-3.5">
              {consolidatedItems.map((item: any, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div className="flex flex-col space-y-0.5 max-w-[70%]">
                    <span className="font-black text-neutral-200">{item.name}</span>
                    <span className="text-[10px] text-neutral-500">{item.quantity} x {currency} {item.unitPrice.toFixed(2)}</span>
                  </div>
                  <span className="font-extrabold text-neutral-300">
                    {currency} {item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="border-t border-neutral-800/15 dark:border-neutral-800 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Tax</span>
                <span>{currency} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-2.5 border-t border-neutral-850 dark:border-neutral-800">
                <span>Grand Total (Open Bill)</span>
                <span className="text-amber-500">{currency} {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="p-4 bg-neutral-950 border border-neutral-850/50 rounded-2xl text-[10px] text-neutral-500 text-center leading-normal">
            🔒 Only showing consolidated billing totals. Individual guest names and specific item allocations are kept anonymous for privacy.
          </div>
        </div>
      )}
    </div>
  );
}
