"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getCustomerOrder } from "../../../../lib/api/customer";
import { getSocket } from "../../../../lib/socket";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Bell,
  UtensilsCrossed,
  XCircle,
  Hash,
  Receipt,
  ArrowLeft,
  AlertTriangle,
  Send,
} from "lucide-react";

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

  // Real-time socket event listeners for status updates
  useEffect(() => {
    if (!id || !order) return;

    const sessionId = order.sessionId || undefined;
    const socket = getSocket(sessionId);

    const refreshOrderData = async () => {
      try {
        const orderRes = await getCustomerOrder(id);
        if (orderRes.success && orderRes.data) {
          setOrder(orderRes.data);
        }
      } catch (err) {
        console.error("Failed to refresh order status", err);
      }
    };

    socket.on("order.accepted", refreshOrderData);
    socket.on("order.preparing", refreshOrderData);
    socket.on("order.ready", refreshOrderData);
    socket.on("order.served", refreshOrderData);
    socket.on("order.completed", refreshOrderData);
    socket.on("order.cancelled", refreshOrderData);
    socket.on("order.status.changed", refreshOrderData);

    return () => {
      socket.off("order.accepted", refreshOrderData);
      socket.off("order.preparing", refreshOrderData);
      socket.off("order.ready", refreshOrderData);
      socket.off("order.served", refreshOrderData);
      socket.off("order.completed", refreshOrderData);
      socket.off("order.cancelled", refreshOrderData);
      socket.off("order.status.changed", refreshOrderData);
    };
  }, [id, order?.sessionId]);

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
      <div className="min-h-screen bg-[#faf9f6] p-5 space-y-5 animate-pulse">
        <div className="flex items-center justify-between pb-4">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-slate-200/60 rounded-xl" />
            <div className="h-3.5 w-28 bg-slate-200/60 rounded-lg" />
          </div>
          <div className="h-9 w-24 bg-slate-200/60 rounded-xl" />
        </div>
        <div className="h-80 w-full bg-white border border-neutral-100 rounded-3xl" />
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
          <h2 className="text-lg font-bold text-slate-800">Failed to track order</h2>
          <p className="text-sm text-slate-400 max-w-[280px]">
            {error || "Order details could not be found."}
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
  const status: OrderStatus = order.orderStatus;

  // Timeline steps with icons and contextual descriptions
  const steps = [
    {
      title: "Order Placed",
      desc: "Your order has been sent to the kitchen",
      activeDesc: "Waiting for the restaurant to confirm...",
      icon: Send,
    },
    {
      title: "Accepted",
      desc: "Restaurant has confirmed your order",
      activeDesc: "Chef is reviewing your order now",
      icon: CheckCircle2,
    },
    {
      title: "Preparing",
      desc: "Your food is being freshly prepared",
      activeDesc: "Our chef is cooking your meal with care",
      icon: ChefHat,
    },
    {
      title: "Ready",
      desc: "Your meal is hot & ready to serve",
      activeDesc: "Being brought to your table now!",
      icon: Bell,
    },
    {
      title: "Served",
      desc: "Enjoy your delicious meal!",
      activeDesc: "Bon appétit! Enjoy your food",
      icon: UtensilsCrossed,
    },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-10">
      <div className="p-4 space-y-5 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-850 tracking-tight">Track Order</h1>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Hash className="w-3.5 h-3.5 text-[#0f5132]/50" />
              <p className="text-xs font-bold uppercase tracking-wider">{order.orderNumber}</p>
            </div>
          </div>
          <Link
            href={`/menu?token=${token || ""}`}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-2xl bg-white border border-neutral-200 text-slate-600 hover:bg-slate-50 font-bold transition-all duration-200 active:scale-[0.97] shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Menu
          </Link>
        </div>

        {/* Cancelled State */}
        {status === "CANCELLED" ? (
          <div className="bg-white rounded-3xl border border-red-100 overflow-hidden shadow-sm">
            <div className="p-8 text-center space-y-4">
              <div className="relative mx-auto w-fit">
                <div className="absolute inset-0 bg-red-500/10 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-red-650 uppercase tracking-wide">
                  Order Cancelled
                </h2>
                <p className="text-xs text-slate-400 max-w-[260px] mx-auto leading-relaxed font-semibold">
                  This order has been cancelled. Please contact restaurant staff for help.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Current Status Banner */}
            <div className="bg-white rounded-3xl border border-neutral-100 p-5 relative overflow-hidden shadow-[0_6px_25px_rgba(0,0,0,0.015)]">
              {/* Ambient glow */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#0f5132]/[0.03] blur-3xl rounded-full pointer-events-none" />

              <div className="relative text-center space-y-1.5">
                <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-[0.2em] block">
                  Current Status
                </span>
                <h2 className="text-2xl font-black text-[#0f5132] uppercase tracking-wide">
                  {status}
                </h2>
                <p className="text-xs text-slate-500 max-w-[265px] mx-auto leading-relaxed">
                  {status === "PENDING" && "Waiting for restaurant to confirm your order."}
                  {status === "ACCEPTED" && "Your order is accepted and assigned to a chef."}
                  {status === "PREPARING" && "Our chef is preparing your meal with care."}
                  {status === "READY" && "Your meal is ready and is being brought to your table!"}
                  {status === "SERVED" && "Enjoy your delicious food!"}
                  {status === "COMPLETED" && "Thank you for dining with us!"}
                </p>
              </div>
            </div>

            {/* Vertical Timeline Stepper */}
            <div className="bg-white rounded-3xl border border-neutral-100 p-5 shadow-[0_6px_25px_rgba(0,0,0,0.015)]">
              <div className="flex flex-col">
                {steps.map((step, idx) => {
                  const completed = statusStepIndex > idx;
                  const active = statusStepIndex === idx;
                  const upcoming = statusStepIndex < idx;
                  const isLast = idx === steps.length - 1;
                  const StepIcon = step.icon;

                  return (
                    <div key={idx} className="flex gap-4 relative">
                      {/* Connecting bar */}
                      {!isLast && (
                        <div className="absolute left-[17px] top-[40px] w-[2px] h-[calc(100%-28px)]">
                          {/* Background track */}
                          <div className="absolute inset-0 bg-slate-100 rounded-full" />
                          {/* Filled portion */}
                          {completed && (
                            <div className="absolute inset-0 bg-emerald-600 rounded-full transition-all duration-500" />
                          )}
                          {active && (
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#0f5132] to-transparent rounded-full transition-all duration-500" />
                          )}
                        </div>
                      )}

                      {/* Step icon circle */}
                      <div className="relative z-10 flex-shrink-0">
                        {completed ? (
                          <div className="w-[36px] h-[36px] rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center transition-all duration-200">
                            <CheckCircle2 className="w-[18px] h-[18px] text-white" />
                          </div>
                        ) : active ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#0f5132]/25 rounded-full blur-md animate-pulse" />
                            <div className="relative w-[36px] h-[36px] rounded-full bg-[#0f5132] border-2 border-white flex items-center justify-center shadow shadow-[#0f5132]/20">
                              <StepIcon className="w-[15px] h-[15px] text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-[36px] h-[36px] rounded-full bg-slate-50 border border-neutral-200 flex items-center justify-center">
                            <StepIcon className="w-[14px] h-[14px] text-slate-350" />
                          </div>
                        )}
                      </div>

                      {/* Step text */}
                      <div className={`pb-7 pt-1 ${isLast ? "pb-0" : ""}`}>
                        <span
                          className={`text-sm font-bold block ${
                            active
                              ? "text-[#0f5132]"
                              : completed
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {step.title}
                        </span>
                        <span
                          className={`text-[10px] leading-relaxed block mt-0.5 ${
                            active
                              ? "text-[#0f5132]/70 font-semibold"
                              : completed
                              ? "text-slate-400"
                              : "text-slate-400"
                          }`}
                        >
                          {active ? step.activeDesc : step.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Table Information */}
        <div className="bg-white rounded-[22px] border border-neutral-100 px-5 py-4 flex items-center justify-between shadow-[0_4px_15px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0f5132]/8 flex items-center justify-center text-[#0f5132]">
              <Hash className="w-4 h-4" />
            </div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Serving Table</span>
          </div>
          <span className="text-sm font-extrabold text-slate-700">
            Table {order.table?.tableNumber}
            {order.table?.tableName && (
              <span className="text-slate-400 font-semibold ml-1.5">({order.table?.tableName})</span>
            )}
          </span>
        </div>

        {/* Order Items Summary */}
        <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-[0_6px_25px_rgba(0,0,0,0.015)]">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-neutral-50 flex items-center gap-2 bg-slate-50/20">
            <Receipt className="w-4 h-4 text-[#0f5132]/60" />
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
              Order Items
            </h3>
          </div>

          {/* Items */}
          <div className="p-5 space-y-4">
            {order.orderItems?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#0f5132] bg-[#0f5132]/8 w-5.5 h-5.5 rounded-md flex items-center justify-center flex-shrink-0">
                      {item.quantity}
                    </span>
                    <span className="text-sm font-bold text-slate-800 truncate">
                      {item.menuItem?.name}
                    </span>
                  </div>

                  {/* Variant & Addons */}
                  {((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) && (
                    <div className="flex flex-wrap gap-1 pl-7">
                      {item.variants?.map((v: any) => (
                        <span
                          key={v.id}
                          className="text-[9px] text-[#0f5132] bg-[#0f5132]/6 px-1.5 py-0.5 rounded border border-[#0f5132]/10 font-bold uppercase tracking-wider"
                        >
                          {v.name}
                        </span>
                      ))}
                      {item.addons?.map((a: any) => (
                        <span
                          key={a.id}
                          className="text-[9px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-neutral-200/50"
                        >
                          + {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[10px] text-slate-400 italic pl-7">
                      &ldquo;{item.notes}&rdquo;
                    </p>
                  )}
                </div>

                <span className="text-sm font-bold text-slate-500 flex-shrink-0 pt-0.5">
                  {currency} {Number(item.subtotal).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing breakdown */}
          <div className="px-5 pb-5 pt-0 space-y-0">
            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Subtotal</span>
                <span className="text-slate-500 font-bold">{currency} {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Tax</span>
                <span className="text-slate-500 font-bold">{currency} {Number(order.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold pt-3 mt-2 border-t border-neutral-100">
                <span className="text-slate-800">Grand Total</span>
                <span className="text-[#0f5132] text-base font-black">{currency} {Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
