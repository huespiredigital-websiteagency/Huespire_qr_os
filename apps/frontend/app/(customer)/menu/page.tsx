"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { useRouter } from "next/navigation";
import { getCustomerTableSession } from "../../../lib/api/customer";
import Link from "next/link";

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

  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";
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
    
    // Filter by orderIds stored in Zustand/localStorage
    const filtered = session.orders.filter((o: any) => orderIds.includes(o.id));
    
    // Sort: Newest active orders first, completed/cancelled below
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
    alert("🔔 Waiter has been notified! A staff member will be at your table shortly.");
  };

  const handleFeedback = () => {
    alert("✍️ Thank you! Feedback portal will open post-payment.");
  };

  if (loadingSession) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-neutral-850 rounded"></div>
        <div className="h-44 w-full bg-neutral-850 rounded-3xl"></div>
        <div className="h-28 w-full bg-neutral-850 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-24">
      {/* 1. Dining Dashboard Section (Rendered when there is an active table session) */}
      {hasActiveSession && myOrders.length > 0 && (
        <div className="p-4 space-y-6">
          {/* Welcome Dashboard Header Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-6 shadow-xl">
            <div className="absolute top-[-20%] right-[-20%] w-36 h-36 bg-amber-500/10 blur-3xl rounded-full"></div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1 text-[9px] font-black text-amber-500 uppercase tracking-wider">
                    🍽 Welcome Back{guestName ? `, ${guestName}` : ""}
                  </div>
                  <h1 className="text-2xl font-black text-white">{restaurant?.name}</h1>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Table {table?.tableNumber} · Session #{session.sessionNumber.slice(-6)}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-black text-[9px] uppercase tracking-wider">
                  Session OPEN
                </span>
              </div>

              {/* Status breakdown */}
              <div className="border-t border-neutral-800/40 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-neutral-500 text-[10px] block font-semibold uppercase tracking-wider">Table Bill Total</span>
                  <span className="text-lg font-black text-amber-500">{currency} {Number(session.totalAmount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block font-semibold uppercase tracking-wider">Est. Wait Time</span>
                  <span className="text-lg font-black text-neutral-200">~ 12-15 Mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={handleContinueOrdering}
              className={`p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                isDark ? "bg-neutral-850 border-neutral-800 hover:bg-neutral-800" : "bg-white border-neutral-100 hover:shadow-sm"
              }`}
            >
              <span className="text-lg block mb-1">📋</span>
              <span className="text-[9px] font-bold text-neutral-400">Order More</span>
            </button>
            <Link
              href={`/my-orders?token=${token}`}
              className={`p-3 rounded-2xl border text-center transition-all block active:scale-95 ${
                isDark ? "bg-neutral-850 border-neutral-800 hover:bg-neutral-800" : "bg-white border-neutral-100 hover:shadow-sm"
              }`}
            >
              <span className="text-lg block mb-1">🍔</span>
              <span className="text-[9px] font-bold text-neutral-400">My Orders</span>
            </Link>
            <Link
              href={`/bill?token=${token}`}
              className={`p-3 rounded-2xl border text-center transition-all block active:scale-95 ${
                isDark ? "bg-neutral-850 border-neutral-800 hover:bg-neutral-800" : "bg-white border-neutral-100 hover:shadow-sm"
              }`}
            >
              <span className="text-lg block mb-1">🧾</span>
              <span className="text-[9px] font-bold text-neutral-400">Table Bill</span>
            </Link>
            <button
              onClick={handleCallWaiter}
              className={`p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                isDark ? "bg-neutral-850 border-neutral-800 hover:bg-neutral-800" : "bg-white border-neutral-100 hover:shadow-sm"
              }`}
            >
              <span className="text-lg block mb-1">🔔</span>
              <span className="text-[9px] font-bold text-neutral-400">Call Waiter</span>
            </button>
          </div>

          {/* Active Orders List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">Active Orders</h3>
            
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
                  className={`border rounded-3xl transition-all overflow-hidden ${
                    isCancelled
                      ? "opacity-60 bg-neutral-900/10 border-neutral-850"
                      : isDark
                      ? "bg-neutral-900/50 border-neutral-800"
                      : "bg-white border-neutral-100 shadow-sm"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-neutral-200">{order.orderNumber}</span>
                        <span className="text-[10px] text-neutral-500">· {orderTime}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        {order.orderItems?.length} {order.orderItems?.length === 1 ? "item" : "items"} placed
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                        status === "PENDING" && "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                      } ${
                        status === "ACCEPTED" && "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                      } ${
                        status === "PREPARING" && "bg-purple-500/10 text-purple-400 border border-purple-500/10 animate-pulse"
                      } ${
                        status === "READY" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                      } ${
                        isCompleted && "bg-neutral-800 text-neutral-400 border border-neutral-750"
                      } ${
                        isCancelled && "bg-red-500/10 text-red-500 border border-red-500/10"
                      }`}>
                        {status}
                      </span>
                      <span className="font-black text-xs text-neutral-300">
                        {currency} {Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Order Progress Timeline */}
                  {!isCancelled && !isCompleted && (
                    <div className="px-5 pb-5 pt-2 border-t border-neutral-800/10 dark:border-neutral-850">
                      <div className="flex justify-between items-center relative">
                        {/* Connecting Line */}
                        <div className="absolute left-1 right-1 top-[11px] h-[2px] bg-neutral-800 -z-0">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${(activeStepIdx / (steps.length - 1)) * 100}%` }}
                          ></div>
                        </div>

                        {steps.map((step, idx) => {
                          const done = activeStepIdx >= idx;
                          const active = activeStepIdx === idx;
                          return (
                            <div key={idx} className="flex flex-col items-center space-y-1.5 z-10">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[8px] transition-all ${
                                done
                                  ? "bg-amber-500 border-amber-500 text-neutral-950 shadow shadow-amber-500/10"
                                  : isDark
                                  ? "bg-neutral-900 border-neutral-800 text-neutral-600"
                                  : "bg-neutral-50 border-neutral-200 text-neutral-450"
                              }`}>
                                {done ? "✓" : idx + 1}
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-wider ${
                                active ? "text-amber-500" : done ? "text-neutral-300" : "text-neutral-550"
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
                    <div className="px-5 pb-5 pt-3 border-t border-neutral-800/20 dark:border-neutral-850/50 bg-neutral-950/20 space-y-3">
                      <div className="space-y-2.5">
                        {order.orderItems?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-neutral-300">{item.quantity}x {item.menuItem?.name}</span>
                              <div className="flex flex-wrap gap-1">
                                {item.variants?.map((v: any) => (
                                  <span key={v.id} className="text-[8px] text-amber-500 font-bold bg-amber-500/5 px-1 py-0.25 rounded">
                                    {v.name}
                                  </span>
                                ))}
                                {item.addons?.map((a: any) => (
                                  <span key={a.id} className="text-[8px] text-neutral-500 bg-neutral-800 px-1 py-0.25 rounded">
                                    + {a.name}
                                  </span>
                                ))}
                              </div>
                              {item.notes && (
                                <p className="text-[9px] text-neutral-500 italic mt-0.5">"{item.notes}"</p>
                              )}
                            </div>
                            <span className="font-semibold text-neutral-450">{currency} {Number(item.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Expand Toggle Button */}
                  <button
                    onClick={() => toggleOrderExpand(order.id)}
                    className="w-full py-2.5 text-center text-[10px] font-bold bg-neutral-950/10 border-t border-neutral-800/10 dark:border-neutral-850/40 text-neutral-400 hover:text-neutral-300 transition-all block"
                  >
                    {isExpanded ? "Collapse Details ↑" : "Expand Details ↓"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Continue Ordering / Large CTA */}
          <div className="pt-2">
            <button
              onClick={handleContinueOrdering}
              className="w-full py-4.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm rounded-2xl transition-all hover:scale-[1.01] active:scale-95 text-center shadow-lg shadow-amber-500/5"
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
            <div className="p-4 space-y-4">
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-amber-600/5 border border-neutral-800 rounded-3xl p-6 text-center">
                <div className="text-4xl mb-3">🍽️</div>
                <h1 className="text-xl font-black text-white">
                  Welcome {guestName ? `back, ${guestName}` : `to ${restaurant?.name}`}
                </h1>
                <p className="text-neutral-400 text-xs mt-1">Ready to order? Browse our menu and customize your dishes.</p>
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-4">
                  Table {table?.tableNumber} · {table?.tableName}
                </div>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="px-4 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500 px-1">Digital Menu</h3>
              <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} px-1`}>
                Delivered straight to your table
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search pizza, drinks, desserts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-3 pl-10 pr-4 text-sm rounded-2xl border transition-all ${
                  isDark
                    ? "bg-neutral-855 border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-500"
                    : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500"
                } focus:outline-none focus:ring-1 focus:ring-amber-500`}
              />
              <span className="absolute left-3.5 top-3.5 text-neutral-550 text-sm">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-neutral-450 text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Featured items */}
          {!searchQuery && !selectedCategoryId && featuredItems.length > 0 && (
            <div className="py-2 space-y-3">
              <div className="px-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Popular Choices</h3>
                <span className="text-[10px] text-neutral-500">Chef Specials</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto px-4 pb-3 scrollbar-none snap-x">
                {featuredItems.map((item) => {
                  const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";
                  return (
                    <Link
                      href={`/menu/${item.id}?token=${token}`}
                      key={`feat-${item.id}`}
                      className={`flex-shrink-0 w-64 snap-start rounded-3xl overflow-hidden border p-3 flex flex-col justify-between transition-all active:scale-[0.98] ${
                        isDark
                          ? "bg-neutral-900/40 border-neutral-800 hover:bg-neutral-850/60"
                          : "bg-white border-neutral-100 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-3 bg-neutral-850">
                        {primaryImg ? (
                          <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                            No Image
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-neutral-900/80 backdrop-blur-md text-[10px] px-2 py-0.5 rounded-full text-amber-500 font-bold">
                          {item.preparationTime}m
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {item.isVeg ? (
                            <span className="w-2.5 h-2.5 border border-emerald-600 rounded-sm p-[1px] flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            </span>
                          ) : (
                            <span className="w-2.5 h-2.5 border border-red-600 rounded-sm p-[1px] flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            </span>
                          )}
                          <span className="text-xs font-semibold text-neutral-450">{item.calories || 0} kcal</span>
                        </div>
                        <h4 className="font-bold text-sm truncate">{item.name}</h4>
                        <p className={`text-xs truncate ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
                          {item.description || "Fresh and delicious item."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-extrabold text-sm text-amber-500">
                          {currency} {Number(item.price).toFixed(2)}
                        </span>
                        <span className="text-xs bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-xl font-bold">
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
          <div className={`sticky top-[58px] z-40 border-y py-2.5 backdrop-blur-md overflow-x-auto flex gap-2 px-4 scrollbar-none ${
            isDark ? "bg-neutral-900/90 border-neutral-800" : "bg-white/90 border-neutral-100"
          }`}>
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategoryId === null
                  ? "bg-amber-500 text-neutral-950 scale-105"
                  : isDark
                  ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All Menu
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategoryId === cat.id
                    ? "bg-amber-500 text-neutral-950 scale-105"
                    : isDark
                    ? "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grouped Category Items List */}
          <div className="px-4 space-y-8">
            {filteredItemsGrouped.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl">🍽️</span>
                <p className={`text-sm ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                  No menu items found. Try searching for something else!
                </p>
              </div>
            ) : (
              filteredItemsGrouped.map((cat: any) => (
                <div key={cat.id} className="space-y-4">
                  <h3 className="text-sm font-extrabold flex items-center justify-between border-b pb-1 border-neutral-800/10 dark:border-neutral-800">
                    <span>{cat.name}</span>
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                      isDark ? "bg-neutral-800 text-neutral-400" : "bg-neutral-100 text-neutral-550"
                    }`}>
                      {cat.menuItems.length} items
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {cat.menuItems.map((item: any) => {
                      const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";
                      const outOfStock = !item.isAvailable;
                      return (
                        <Link
                          href={`/menu/${item.id}?token=${token}`}
                          key={item.id}
                          className={`flex gap-4 p-3 rounded-2xl border transition-all active:scale-[0.99] ${
                            outOfStock ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isDark
                              ? "bg-neutral-800/20 border-neutral-850 hover:bg-neutral-800/40"
                              : "bg-white border-neutral-100 hover:shadow-sm"
                          }`}
                        >
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-neutral-850 flex-shrink-0">
                            {primaryImg ? (
                              <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500 text-center">
                                No Image
                              </div>
                            )}
                            {outOfStock && (
                              <div className="absolute inset-0 bg-black/75 backdrop-blur-xxs flex items-center justify-center">
                                <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">
                                  Sold Out
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                {item.isVeg ? (
                                  <span className="w-2.5 h-2.5 border border-emerald-600 rounded-sm p-[1px] flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  </span>
                                ) : (
                                  <span className="w-2.5 h-2.5 border border-red-600 rounded-sm p-[1px] flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                  </span>
                                )}
                                <span className="text-[10px] text-neutral-550">
                                  {item.calories ? `${item.calories} kcal` : ""} {item.preparationTime ? `· ${item.preparationTime}m` : ""}
                                </span>
                              </div>
                              
                              <h4 className="font-extrabold text-sm truncate">{item.name}</h4>
                              <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                                isDark ? "text-neutral-400" : "text-neutral-500"
                              }`}>
                                {item.description || "Freshly cooked to order."}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-extrabold text-sm text-amber-500">
                                {currency} {Number(item.price).toFixed(2)}
                              </span>
                              {!outOfStock && (
                                <span className="text-[11px] bg-amber-500 text-neutral-950 px-3 py-1 rounded-xl font-extrabold transition-all hover:bg-amber-400">
                                  Add +
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
        <div className="fixed bottom-[58px] left-1/2 -translate-x-1/2 w-full max-w-md p-4 z-50 transition-all duration-300">
          <Link
            href={`/cart?token=${token}`}
            className="flex items-center justify-between bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="bg-neutral-950 text-amber-500 text-xs px-2.5 py-1 rounded-full font-black">
                {cartCount} {cartCount === 1 ? "Item" : "Items"}
              </span>
              <span className="text-sm font-extrabold">View Cart</span>
            </div>
            <span className="text-sm font-black">
              {currency} {cartTotalAmount.toFixed(2)} →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
