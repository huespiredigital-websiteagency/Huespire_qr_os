"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { useRouter } from "next/navigation";
import { getCustomerTableSession } from "../../../lib/api/customer";
import Link from "next/link";
import {
  Search,
  X,
  UtensilsCrossed,
  ShoppingCart,
  Receipt,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  ArrowRight,
  Flame,
  Loader2,
  Plus,
  Compass,
  Star,
  Activity,
  User,
} from "lucide-react";

type OrderStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";

export default function MenuPage() {
  const router = useRouter();
  const categories = useCustomerStore((state) => state.categories);
  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const token = useCustomerStore((state) => state.token);
  const cart = useCustomerStore((state) => state.cart);
  const orderIds = useCustomerStore((state) => state.orderIds);
  const guestName = useCustomerStore((state) => state.guestName);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Dashboard states
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showMenuSection, setShowMenuSection] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<{ [key: string]: boolean }>({});
  
  const menuRef = useRef<HTMLDivElement>(null);

  const theme = restaurant?.theme || "light";
  const currency = restaurant?.currency || "INR";

  // Fetch session details on mount and poll every 5s
  useEffect(() => {
    if (!token) return;

    const fetchSession = async () => {
      try {
        const res = await getCustomerTableSession(token);
        if (res.success && res.data) {
          setSession(res.data);
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Failed to load table session on dashboard", err);
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Determine if there is an active session with orders placed
  const hasActiveSession = useMemo(() => {
    return session && session.status === "OPEN";
  }, [session]);

  // Filter orders created by this device/browser
  const myOrders = useMemo(() => {
    if (!session || !session.orders) return [];
    
    const filtered = session.orders.filter((o: any) => orderIds.includes(o.id));
    
    return filtered.sort((a: any, b: any) => {
      const aFinished = ["SERVED", "COMPLETED", "CANCELLED"].includes(a.orderStatus);
      const bFinished = ["SERVED", "COMPLETED", "CANCELLED"].includes(b.orderStatus);
      if (aFinished && !bFinished) return 1;
      if (!aFinished && bFinished) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [session, orderIds]);

  // If there are no orders placed by the user, default to showing the menu
  useEffect(() => {
    if (!loadingSession) {
      if (myOrders.length === 0) {
        setShowMenuSection(true);
      }
    }
  }, [myOrders, loadingSession]);

  // Toggle order card expansion
  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Flatten items for search
  const allItems = useMemo(() => {
    const items: any[] = [];
    categories.forEach((cat: any) => {
      cat.menuItems.forEach((item: any) => {
        items.push({
          ...item,
          categoryName: cat.name,
        });
      });
    });
    return items;
  }, [categories]);

  // Filter items based on category and search query
  const filteredItemsGrouped = useMemo(() => {
    return categories.map((cat: any) => {
      const matchedItems = cat.menuItems.filter((item: any) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return matchesSearch;
      });

      return {
        ...cat,
        menuItems: matchedItems,
      };
    }).filter((cat: any) => {
      if (selectedCategoryId && cat.id !== selectedCategoryId) {
        return false;
      }
      return cat.menuItems.length > 0;
    });
  }, [categories, selectedCategoryId, searchQuery]);

  // Featured items picker
  const featuredItems = useMemo(() => {
    return allItems.filter((item) => item.isAvailable).slice(0, 3);
  }, [allItems]);

  const cartTotalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Status mapping for timeline progress
  const getTimelineStepIndex = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return 0;
      case "ACCEPTED": return 1;
      case "PREPARING": return 2;
      case "READY": return 3;
      case "SERVED":
      case "COMPLETED": return 4;
      default: return 0;
    }
  };

  const steps = ["Placed", "Accepted", "Preparing", "Ready", "Served"];

  const handleContinueOrdering = () => {
    setShowMenuSection(true);
    setTimeout(() => {
      menuRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCallWaiter = () => {
    alert("Waiter has been notified! A staff member will be at your table shortly.");
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "ACCEPTED": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "PREPARING": return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "READY": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "SERVED":
      case "COMPLETED": return "bg-slate-50 text-slate-500 border-neutral-100";
      case "CANCELLED": return "bg-red-500/10 text-red-700 border-red-500/20";
      default: return "bg-slate-50 text-slate-500 border-neutral-100";
    }
  };

  if (loadingSession) {
    return (
      <div className="p-5 space-y-6 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg"></div>
        <div className="h-40 w-full bg-slate-200/60 rounded-3xl"></div>
        <div className="h-24 w-full bg-slate-200/60 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-24 font-sans text-slate-800">
      
      {/* 1. Dining Dashboard Section (Rendered when active session + orders exists) */}
      {hasActiveSession && myOrders.length > 0 && (
        <div className="p-4 space-y-5">
          {/* Welcome Dashboard Header Card */}
          <div className="relative overflow-hidden bg-white border border-neutral-100 rounded-3xl p-5 shadow-[0_6px_25px_rgba(0,0,0,0.015)]">
            <div className="absolute top-[-30%] right-[-20%] w-40 h-40 bg-[#0f5132]/[0.02] blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-[#0f5132]/8 border border-[#0f5132]/10 rounded-full px-2.5 py-1 text-[9px] font-extrabold text-[#0f5132] uppercase tracking-wider">
                    <User className="w-3 h-3" />
                    Welcome Back{guestName ? `, ${guestName}` : ""}
                  </div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">{restaurant?.name}</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Table {table?.tableNumber} · Session #{session.sessionNumber.slice(-6)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 rounded-full font-extrabold text-[9px] px-2.5 py-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Active
                </span>
              </div>

              {/* Status details grid */}
              <div className="border-t border-neutral-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] block font-extrabold uppercase tracking-wider">Table Bill Total</span>
                  <span className="text-lg font-black text-[#0f5132]">{currency} {Number(session.totalAmount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-extrabold uppercase tracking-wider">Est. Wait Time</span>
                  <span className="text-lg font-black text-slate-700">~ 12-15 Mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Order More", icon: <UtensilsCrossed className="w-4.5 h-4.5" />, action: handleContinueOrdering },
              { label: "My Orders", icon: <ClipboardList className="w-4.5 h-4.5" />, href: `/my-orders?token=${token}` },
              { label: "Table Bill", icon: <Receipt className="w-4.5 h-4.5" />, href: `/bill?token=${token}` },
              { label: "Call Waiter", icon: <Bell className="w-4.5 h-4.5" />, action: handleCallWaiter },
            ].map((item, idx) => {
              const innerContent = (
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="w-9 h-9 rounded-full bg-slate-50 border border-neutral-100 flex items-center justify-center text-slate-500 group-hover:text-[#0f5132] transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{item.label}</span>
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="group bg-white border border-neutral-100 rounded-2xl p-2.5 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-neutral-200"
                  >
                    {innerContent}
                  </Link>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="group bg-white border border-neutral-100 rounded-2xl p-2.5 flex flex-col items-center justify-center transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:border-neutral-200"
                >
                  {innerContent}
                </button>
              );
            })}
          </div>

          {/* Active Orders List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">Active Orders</h3>
            
            {myOrders.map((order: any) => {
              const status: OrderStatus = order.orderStatus;
              const isCancelled = status === "CANCELLED";
              const isCompleted = ["SERVED", "COMPLETED"].includes(status);
              const activeStepIdx = getTimelineStepIndex(status);
              const isExpanded = !!expandedOrders[order.id];
              const orderTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-2xl transition-all overflow-hidden ${
                    isCancelled ? "opacity-60 border-neutral-200" : "border-neutral-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 flex justify-between items-start gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-800">{order.orderNumber}</span>
                        <span className="text-[10px] text-slate-400">· {orderTime}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {order.orderItems?.length} {order.orderItems?.length === 1 ? "item" : "items"} placed
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${getStatusColor(status)}`}>
                        {status}
                      </span>
                      <span className="font-extrabold text-xs text-slate-600">
                        {currency} {Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Order Progress Timeline */}
                  {!isCancelled && !isCompleted && (
                    <div className="px-4 pb-4 pt-1">
                      <div className="flex justify-between items-center relative">
                        {/* Connecting Line */}
                        <div className="absolute left-1 right-1 top-[11px] h-[2px] bg-slate-100 -z-0">
                          <div
                            className="h-full bg-[#0f5132] transition-all duration-500"
                            style={{ width: `${(activeStepIdx / (steps.length - 1)) * 100}%` }}
                          ></div>
                        </div>

                        {steps.map((step, idx) => {
                          const done = activeStepIdx >= idx;
                          const active = activeStepIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center space-y-1 z-10">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[8px] transition-all ${
                                done
                                  ? "bg-[#0f5132] border-[#0f5132] text-white shadow shadow-[#0f5132]/10"
                                  : "bg-white border-neutral-200 text-neutral-400"
                              }`}>
                                {done ? "✓" : idx + 1}
                              </div>
                              <span className={`text-[7px] font-extrabold uppercase tracking-wider ${
                                active ? "text-[#0f5132]" : done ? "text-slate-500" : "text-slate-400"
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded Items Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2.5 border-t border-neutral-100 bg-[#faf9f6]/40 space-y-3">
                      <div className="space-y-2">
                        {order.orderItems?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-700">{item.quantity}x {item.menuItem?.name}</span>
                              <div className="flex flex-wrap gap-1">
                                {item.variants?.map((v: any) => (
                                  <span key={v.id} className="text-[8px] text-[#0f5132] font-bold bg-[#0f5132]/5 px-1.5 py-0.5 rounded">
                                    {v.name}
                                  </span>
                                ))}
                                {item.addons?.map((a: any) => (
                                  <span key={a.id} className="text-[8px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    + {a.name}
                                  </span>
                                ))}
                              </div>
                              {item.notes && (
                                <p className="text-[9px] text-slate-400 italic mt-0.5">&quot;{item.notes}&quot;</p>
                              )}
                            </div>
                            <span className="font-bold text-slate-500">{currency} {Number(item.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Expand Toggle Button */}
                  <button
                    onClick={() => toggleOrderExpand(order.id)}
                    className="w-full py-2.5 text-center text-[10px] font-extrabold border-t border-neutral-100 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-1"
                  >
                    {isExpanded ? (
                      <>Collapse Details <ChevronUp className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Expand Details <ChevronDown className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Continue Ordering / Large CTA */}
          <div className="pt-2">
            <button
              onClick={handleContinueOrdering}
              className="w-full py-3.5 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-95 text-center shadow-md shadow-[#0f5132]/10"
            >
              Browse Menu & Add Items
            </button>
          </div>
        </div>
      )}

      {/* 2. Menu Browsing Section (Toggled or visible if no orders) */}
      {(!hasActiveSession || myOrders.length === 0 || showMenuSection) && (
        <div ref={menuRef} className="space-y-6">
          {/* Welcome banner if no orders */}
          {(!hasActiveSession || myOrders.length === 0) && (
            <div className="px-4">
              <div className="relative overflow-hidden bg-white border border-neutral-100 rounded-3xl p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,81,50,0.025)_0%,transparent_75%)] pointer-events-none"></div>
                <div className="w-12 h-12 bg-[#0f5132]/8 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Compass className="w-6 h-6 text-[#0f5132]" />
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-800">
                  Welcome {guestName ? `back, ${guestName}` : `to ${restaurant?.name}`}
                </h1>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">Ready to order? Browse our menu and customize your dishes.</p>
                <div className="inline-block text-[9px] font-extrabold text-[#0f5132] uppercase tracking-wider mt-4 bg-[#0f5132]/5 px-3 py-1 rounded-full border border-[#0f5132]/10">
                  Table {table?.tableNumber} · {table?.tableName}
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#0f5132] px-0.5">Digital Menu</h3>
              <p className="text-xs text-slate-400 px-0.5">
                Delivered straight to your table
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search dishes, drinks, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-3.5 pl-10 pr-10 text-sm rounded-2xl border border-neutral-100 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f5132]/30 focus:border-[#0f5132] transition-all shadow-[0_4px_15px_rgba(0,0,0,0.01)]"
              />
              <Search className="absolute left-3.5 top-[15px] w-4.5 h-4.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-[11px] p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* Featured items */}
          {!searchQuery && !selectedCategoryId && featuredItems.length > 0 && (
            <div className="space-y-3">
              <div className="px-4 flex items-center justify-between">
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Popular Choices
                </h3>
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-neutral-100 px-2 py-0.5 rounded-full">Chef Specials</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-none snap-x">
                {featuredItems.map((item) => {
                  const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";
                  return (
                    <Link
                      href={`/menu/${item.id}?token=${token}`}
                      key={`feat-${item.id}`}
                      className="flex-shrink-0 w-60 snap-start bg-white border border-neutral-100 rounded-3xl p-3 flex flex-col justify-between transition-all duration-200 active:scale-[0.98] shadow-[0_6px_20px_rgba(0,0,0,0.015)] hover:border-neutral-250/60"
                    >
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-3 bg-slate-100">
                        {primaryImg ? (
                          <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            No Image
                          </div>
                        )}
                        {item.preparationTime && (
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md text-[9px] px-2.5 py-0.5 rounded-full text-slate-600 font-bold border border-neutral-100 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-[#0f5132]" />
                            {item.preparationTime}m
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {item.isVeg ? (
                            <span className="w-3.5 h-3.5 border border-emerald-600 rounded-[3px] p-[1.5px] flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </span>
                          ) : (
                            <span className="w-3.5 h-3.5 border border-red-600 rounded-[3px] p-[1.5px] flex items-center justify-center">
                              <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-slate-400">{item.calories || 0} kcal</span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800 truncate">{item.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                          {item.description || "Fresh and delicious item."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-50">
                        <span className="font-black text-sm text-[#0f5132]">
                          {currency} {Number(item.price).toFixed(2)}
                        </span>
                        <span className="text-[10px] bg-[#0f5132]/6 text-[#0f5132] px-2.5 py-1 rounded-xl font-extrabold border border-[#0f5132]/10 transition-colors">
                          Customize +
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Category Navigator */}
          <div className="sticky top-[58px] z-40 border-y border-neutral-100 py-2.5 bg-[#faf9f6]/95 backdrop-blur-xl overflow-x-auto flex gap-2 px-4 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                selectedCategoryId === null
                  ? "bg-[#0f5132] text-white border-[#0f5132] shadow-sm shadow-[#0f5132]/15 scale-105"
                  : "bg-white text-slate-400 border-neutral-100 hover:bg-slate-50"
              }`}
            >
              All Menu
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  selectedCategoryId === cat.id
                    ? "bg-[#0f5132] text-white border-[#0f5132] shadow-sm shadow-[#0f5132]/15 scale-105"
                    : "bg-white text-slate-400 border-neutral-100 hover:bg-slate-50"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grouped Category Items List */}
          <div className="px-4 space-y-8">
            {filteredItemsGrouped.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-white border border-neutral-100 rounded-3xl p-6">
                <UtensilsCrossed className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-400 text-xs">
                  No menu items found. Try searching for something else!
                </p>
              </div>
            ) : (
              filteredItemsGrouped.map((cat: any) => (
                <div key={cat.id} className="space-y-3">
                  <h3 className="text-sm font-extrabold flex items-center justify-between border-b pb-1.5 border-neutral-100">
                    <span className="text-slate-700">{cat.name}</span>
                    <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-neutral-200/50">
                      {cat.menuItems.length} items
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3.5">
                    {cat.menuItems.map((item: any) => {
                      const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";
                      const outOfStock = !item.isAvailable;
                      return (
                        <Link
                          href={`/menu/${item.id}?token=${token}`}
                          key={item.id}
                          className={`flex gap-3.5 p-3 rounded-[20px] bg-white border border-neutral-100 transition-all duration-200 active:scale-[0.99] shadow-[0_4px_15px_rgba(0,0,0,0.01)] hover:border-neutral-200/80 ${
                            outOfStock ? "opacity-60 cursor-not-allowed" : ""
                          }`}
                        >
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                            {primaryImg ? (
                              <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 text-center">
                                No Image
                              </div>
                            )}
                            {outOfStock && (
                              <div className="absolute inset-0 bg-white/90 backdrop-blur-xxs flex items-center justify-center">
                                <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                {item.isVeg ? (
                                  <span className="w-3.5 h-3.5 border border-emerald-600 rounded-[3px] p-[1.5px] flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 border border-red-600 rounded-[3px] p-[1.5px] flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400">
                                  {item.calories ? `${item.calories} kcal` : ""} {item.preparationTime ? `· ${item.preparationTime}m` : ""}
                                </span>
                              </div>
                              
                              <h4 className="font-extrabold text-sm text-slate-800 truncate">{item.name}</h4>
                              <p className="text-xs line-clamp-2 mt-0.5 leading-relaxed text-slate-400">
                                {item.description || "Freshly cooked to order."}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-50">
                              <span className="font-extrabold text-sm text-[#0f5132]">
                                {currency} {Number(item.price).toFixed(2)}
                              </span>
                              {!outOfStock && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#0f5132] text-white px-3 py-1 rounded-lg font-bold shadow-sm shadow-[#0f5132]/10 transition-colors">
                                  <Plus className="w-3.5 h-3.5" />
                                  Add
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Cart Strip */}
      {cartCount > 0 && (
        <div className="fixed bottom-[74px] left-1/2 -translate-x-1/2 w-full max-w-md p-4 z-40 transition-all duration-300">
          <Link
            href={`/cart?token=${token}`}
            className="flex items-center justify-between bg-[#0f5132] hover:bg-[#0d472c] text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-[#0f5132]/15 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-[#0f5132] text-xs px-2.5 py-1 rounded-full font-black">
                {cartCount} {cartCount === 1 ? "Item" : "Items"}
              </span>
              <span className="text-sm font-bold">View Cart</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              <span>{currency} {cartTotalAmount.toFixed(2)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
