"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getCustomerOrder, getCustomerOrderStatus } from "../../../../lib/api/customer";
import Link from "next/link";

type OrderStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const token = searchParams.get("token");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll status
  useEffect(() => {
    if (!id) return;

    const fetchInitialOrder = async () => {
      try {
        setLoading(true);
        const res = await getCustomerOrder(id);
        if (res.success && res.data) {
          setOrder(res.data);
          setError(null);
        } else {
          setError("Order not found");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load order.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialOrder();
  }, [id]);

  // Periodic polling for status changes
  useEffect(() => {
    if (!id || !order) return;
    
    const currentStatus: OrderStatus = order.orderStatus;
    
    // Stop polling if order has reached final states
    if (["SERVED", "COMPLETED", "CANCELLED"].includes(currentStatus)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await getCustomerOrderStatus(id);
        if (res.success && res.data && res.data.status) {
          const newStatus = res.data.status;
          
          if (newStatus !== currentStatus) {
            // Reload order details to refresh the full details
            const orderRes = await getCustomerOrder(id);
            if (orderRes.success && orderRes.data) {
              setOrder(orderRes.data);
            }
          }
        }
      } catch (err) {
        console.error("Failed to poll order status", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, order]);

  // Map status to progress step index (0-4)
  const statusStepIndex = useMemo(() => {
    if (!order) return 0;
    const status: OrderStatus = order.orderStatus;
    switch (status) {
      case "PENDING":
        return 0;
      case "ACCEPTED":
        return 1;
      case "PREPARING":
        return 2;
      case "READY":
        return 3;
      case "SERVED":
      case "COMPLETED":
        return 4;
      case "CANCELLED":
        return -1;
      default:
        return 0;
    }
  }, [order]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-6 w-1/3 bg-neutral-800 rounded"></div>
        <div className="w-full h-40 rounded-3xl bg-neutral-800"></div>
        <div className="h-6 w-1/4 bg-neutral-800 rounded"></div>
        <div className="h-40 w-full bg-neutral-800 rounded-3xl"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center space-y-4">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-bold text-red-500">Failed to track order</h2>
        <p className="text-sm text-neutral-400">{error || "Order details could not be found."}</p>
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
  const status: OrderStatus = order.orderStatus;

  // Timeline steps definition
  const steps = [
    { title: "Placed", desc: "Sent to kitchen" },
    { title: "Accepted", desc: "Chef confirmed" },
    { title: "Preparing", desc: "Cooking food" },
    { title: "Ready", desc: "Hot & fresh" },
    { title: "Served", desc: "Delivered!" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black">Track Order</h1>
          <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
            Order: {order.orderNumber}
          </p>
        </div>
        <Link
          href={`/menu?token=${token || ""}`}
          className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
            isDark ? "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700" : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          View Menu
        </Link>
      </div>

      {/* Main Status Circle / Card */}
      {status === "CANCELLED" ? (
        <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
          <span className="text-5xl">🛑</span>
          <h2 className="text-lg font-extrabold text-red-500 uppercase">Order Cancelled</h2>
          <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
            This order has been cancelled. Please contact restaurant staff for help.
          </p>
        </div>
      ) : (
        <div className={`p-6 rounded-3xl border text-center space-y-4 relative overflow-hidden ${
          isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
        }`}>
          {/* Subtle glowing indicator */}
          <div className="absolute top-[-10%] left-[40%] w-[20%] h-[20%] bg-amber-500/10 blur-2xl rounded-full"></div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Current Status</span>
            <h2 className="text-2xl font-black text-amber-500 uppercase tracking-wide">
              {status}
            </h2>
            <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-550"}`}>
              {status === "PENDING" && "Waiting for restaurant to confirm your order."}
              {status === "ACCEPTED" && "Your order is accepted and assigned to a chef."}
              {status === "PREPARING" && "Our chef is preparing your meal with care."}
              {status === "READY" && "Your meal is ready and is being brought to your table!"}
              {status === "SERVED" && "Enjoy your delicious food!"}
              {status === "COMPLETED" && "Thank you for dining with us!"}
            </p>
          </div>

          {/* Simple Timeline Indicator */}
          <div className="pt-4 flex flex-col gap-6 text-left pl-2">
            {steps.map((step, idx) => {
              const completed = statusStepIndex >= idx;
              const active = statusStepIndex === idx;
              
              return (
                <div key={idx} className="flex gap-4 items-start relative">
                  {/* Vertical bar connecting items */}
                  {idx < steps.length - 1 && (
                    <div className={`absolute left-3 top-7 w-[2px] h-[36px] ${
                      statusStepIndex > idx ? "bg-amber-500" : isDark ? "bg-neutral-850" : "bg-neutral-100"
                    }`} />
                  )}

                  {/* Circle checkmark or index */}
                  <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] z-10 border transition-all ${
                    completed
                      ? "bg-amber-500 border-amber-500 text-neutral-950 shadow-md shadow-amber-500/10"
                      : isDark
                      ? "bg-neutral-900 border-neutral-850 text-neutral-500"
                      : "bg-neutral-50 border-neutral-200 text-neutral-400"
                  }`}>
                    {completed ? "✓" : idx + 1}
                  </div>

                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${
                      active ? "text-amber-500" : completed ? "text-white dark:text-neutral-200" : "text-neutral-500"
                    }`}>
                      {step.title}
                    </span>
                    <span className="text-[10px] text-neutral-500">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Information Card */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
        isDark ? "bg-neutral-900/20 border-neutral-800" : "bg-neutral-50 border-neutral-100"
      }`}>
        <span className="text-neutral-400">Serving Table</span>
        <span className="font-extrabold text-amber-500">
          Table {order.table?.tableNumber} ({order.table?.tableName})
        </span>
      </div>

      {/* Order Item List Card */}
      <div className={`p-5 rounded-3xl border space-y-4 ${
        isDark ? "bg-neutral-900/30 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
      }`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800/10 dark:border-neutral-800 pb-2">
          Order Items
        </h3>

        <div className="space-y-3">
          {order.orderItems?.map((item: any) => (
            <div key={item.id} className="flex justify-between items-start text-sm">
              <div className="space-y-1 max-w-[70%]">
                <span className="font-bold">
                  {item.quantity}x {item.menuItem?.name}
                </span>
                
                {/* Variant & Addons */}
                <div className="flex flex-wrap gap-1">
                  {item.variants?.map((v: any) => (
                    <span key={v.id} className="text-[9px] text-amber-500 bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10 font-bold">
                      {v.name}
                    </span>
                  ))}
                  {item.addons?.map((a: any) => (
                    <span key={a.id} className="text-[9px] text-neutral-400 bg-neutral-800 px-1 py-0.5 rounded border border-neutral-700/20">
                      + {a.name}
                    </span>
                  ))}
                </div>

                {item.notes && (
                  <p className="text-[10px] text-neutral-500 italic">"{item.notes}"</p>
                )}
              </div>
              
              <span className="font-extrabold text-neutral-300">
                {currency} {Number(item.subtotal).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing breakdown */}
        <div className="border-t border-neutral-800/15 dark:border-neutral-800 pt-3.5 space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal</span>
            <span>{currency} {Number(order.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Tax</span>
            <span>{currency} {Number(order.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-neutral-850 dark:border-neutral-800">
            <span>Grand Total Paid</span>
            <span className="text-amber-500">{currency} {Number(order.totalAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
