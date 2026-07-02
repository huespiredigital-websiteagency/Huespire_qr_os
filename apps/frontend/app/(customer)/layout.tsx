"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCustomerStore } from "../../lib/store/customer-store";
import { getCustomerMenu } from "../../lib/api/customer";
import Link from "next/link";
import {
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  Receipt,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";

function CustomerStateLoader({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const token = useCustomerStore((state) => state.token);
  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const cart = useCustomerStore((state) => state.cart);
  const setToken = useCustomerStore((state) => state.setToken);
  const setMenuData = useCustomerStore((state) => state.setMenuData);
  const clearCart = useCustomerStore((state) => state.clearCart);
  const guestName = useCustomerStore((state) => state.guestName);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);

  // Get token from URL query or path segments (e.g. /menu/[token])
  const tokenFromUrl = searchParams.get("token") || (() => {
    if (!pathname) return null;
    const parts = pathname.split("/");
    const hexToken = parts.find((part) => /^[a-fA-F0-9]{32}$/.test(part));
    return hexToken || null;
  })();

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      const storedToken = useCustomerStore.getState().token;
      if (!storedToken) {
        setError("Missing table QR token. Please scan the table QR code to view the menu.");
        setLoading(false);
      }
    }
  }, [tokenFromUrl, setToken]);

  const activeToken = token || tokenFromUrl;

  useEffect(() => {
    if (!activeToken) return;

    const fetchMenu = async () => {
      try {
        setLoading(true);
        const res = await getCustomerMenu(activeToken);
        if (res.success && res.data) {
          setMenuData(res.data);
          setError(null);
          if (res.data.activeSession) {
            setActiveSessionData(res.data.activeSession);
          }

          // Check if session was closed by cashier
          const storedSession = useCustomerStore.getState().sessionId;
          if (storedSession && !res.data.activeSession) {
            useCustomerStore.getState().clearSession();
          }
        } else {
          setError("Failed to load restaurant details. The QR code might be inactive.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Invalid or expired QR code.");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [activeToken, setMenuData]);

  // Handle welcome back prompt
  useEffect(() => {
    const welcomeParam = searchParams.get("welcome");
    const storedSession = useCustomerStore.getState().sessionId;
    if (welcomeParam === "true" && storedSession && activeSessionData) {
      setShowWelcomeBack(true);
    }
  }, [searchParams, activeSessionData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-neutral-100">
            <Loader2 className="w-6 h-6 text-[#0f5132] animate-spin" />
          </div>
          <p className="text-slate-500 text-xs tracking-wide animate-pulse">Loading Digital Menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans text-center">
        <div className="max-w-sm w-full bg-white border border-neutral-100 rounded-3xl p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50/80 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">{error}</p>
          <p className="text-[10px] text-slate-400">Please re-scan the physical QR code placed at your table.</p>
        </div>
      </div>
    );
  }

  if (showWelcomeBack && restaurant && table && activeSessionData) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans text-center relative overflow-hidden">
        {/* Soft elegant warm ambient glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(15,81,50,0.04)_0%,transparent_60%)] pointer-events-none"></div>
        
        <div className="max-w-sm w-full bg-white border border-neutral-100 rounded-3xl p-7 shadow-[0_12px_40px_rgba(0,0,0,0.03)] space-y-6 z-10">
          <div className="inline-flex items-center gap-1.5 bg-[#0f5132]/8 border border-[#0f5132]/10 rounded-full px-3.5 py-1.5 text-[10px] font-extrabold text-[#0f5132] uppercase tracking-wider mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            Welcome Back{guestName ? `, ${guestName}` : ""}
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-850">{restaurant.name}</h1>
            <p className="text-slate-400 text-xs font-semibold">Table {table.tableNumber} · {table.tableName}</p>
          </div>

          <div className="bg-[#faf9f6] border border-neutral-100/80 rounded-2xl p-5 space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dining Session</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            
            <div className="border-t border-neutral-250/20 pt-3 flex justify-between items-center">
              <span className="text-slate-500 text-xs font-medium">Consolidated Bill</span>
              <span className="text-lg font-black text-[#0f5132]">
                {restaurant.currency} {Number(activeSessionData.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setShowWelcomeBack(false);
                const url = new URL(window.location.href);
                url.searchParams.delete("welcome");
                window.history.replaceState({}, "", url.toString());
              }}
              className="w-full py-3.5 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold rounded-2xl text-sm transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm shadow-[#0f5132]/10"
            >
              Continue Ordering
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href={`/my-orders?token=${activeToken}`}
              onClick={() => setShowWelcomeBack(false)}
              className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl text-sm block border border-neutral-200/50 transition-all duration-200 active:scale-[0.97] text-center"
            >
              View My Orders
            </Link>
            <Link
              href={`/bill?token=${activeToken}`}
              onClick={() => setShowWelcomeBack(false)}
              className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold rounded-2xl text-xs block transition-all text-center"
            >
              View Table Bill
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const theme = restaurant?.theme || "light";

  // Check active path for styling
  const isMenu = pathname.startsWith("/menu");
  const isCart = pathname.startsWith("/cart");
  const isOrders = pathname.startsWith("/my-orders") || pathname.startsWith("/order-tracking") || pathname.startsWith("/order-success");
  const isBill = pathname.startsWith("/bill");

  return (
    <div className="min-h-screen bg-slate-100/50 text-slate-800 flex justify-center font-sans antialiased transition-colors duration-300">
      <div className="w-full max-w-md bg-[#faf9f6] min-h-screen shadow-lg flex flex-col relative">
        {/* Customer Header */}
        <header className="px-4 py-3 border-b border-black/[0.03] bg-[#faf9f6]/95 backdrop-blur-xl flex justify-between items-center sticky top-0 z-50">
          <Link href={`/menu?token=${activeToken}`} className="flex items-center gap-2.5 group">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-[#0f5132]/10"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-[#0f5132]/8 text-[#0f5132] border border-[#0f5132]/10 flex items-center justify-center font-black text-base shadow-sm">
                {restaurant?.name?.charAt(0) || "R"}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-extrabold text-sm leading-tight text-slate-800 group-hover:text-[#0f5132] transition-colors">{restaurant?.name || "Restaurant Menu"}</span>
              {table && (
                <span className="text-[10px] text-slate-400 font-bold">
                  Table {table.tableNumber}
                </span>
              )}
            </div>
          </Link>
          
          <Link
            href={`/cart?token=${activeToken}`}
            className="relative p-2 rounded-xl transition-all duration-200 hover:bg-slate-100 active:scale-95"
          >
            <ShoppingCart className="w-5 h-5 text-slate-500" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#0f5132] text-white rounded-full font-bold text-[9px] min-w-[18px] h-[18px] flex items-center justify-center px-0.5 shadow-sm">
                {cartCount}
              </span>
            )}
          </Link>
        </header>

        {/* Customer View Content */}
        <main className="flex-1 overflow-y-auto pb-28">
          {children}
        </main>

        {/* Luxury Floating Bottom Navigation Bar */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] z-50">
          <nav className="bg-white/85 backdrop-blur-xl border border-black/[0.03] shadow-[0_10px_35px_rgba(0,0,0,0.06)] rounded-3xl px-3 py-2 flex justify-between items-center">
            {/* Menu Tab */}
            {isMenu ? (
              <div className="bg-[#0f5132]/10 text-[#0f5132] px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all duration-300 animate-scale-in">
                <UtensilsCrossed className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-wider">Menu</span>
              </div>
            ) : (
              <Link
                href={`/menu?token=${activeToken}`}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl transition-all duration-200 active:scale-90"
              >
                <UtensilsCrossed className="w-5 h-5" strokeWidth={1.8} />
              </Link>
            )}

            {/* Cart Tab */}
            {isCart ? (
              <div className="bg-[#0f5132]/10 text-[#0f5132] px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all duration-300 animate-scale-in relative">
                <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-wider">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#0f5132] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
            ) : (
              <Link
                href={`/cart?token=${activeToken}`}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl transition-all duration-200 active:scale-90 relative"
              >
                <ShoppingCart className="w-5 h-5" strokeWidth={1.8} />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-slate-400 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Orders Tab */}
            {isOrders ? (
              <div className="bg-[#0f5132]/10 text-[#0f5132] px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all duration-300 animate-scale-in">
                <ClipboardList className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-wider">Orders</span>
              </div>
            ) : (
              <Link
                href={`/my-orders?token=${activeToken}`}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl transition-all duration-200 active:scale-90"
              >
                <ClipboardList className="w-5 h-5" strokeWidth={1.8} />
              </Link>
            )}

            {/* Bill Tab */}
            {isBill ? (
              <div className="bg-[#0f5132]/10 text-[#0f5132] px-4 py-2 rounded-2xl flex items-center gap-1.5 transition-all duration-300 animate-scale-in">
                <Receipt className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-wider">Bill</span>
              </div>
            ) : (
              <Link
                href={`/bill?token=${activeToken}`}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl transition-all duration-200 active:scale-90"
              >
                <Receipt className="w-5 h-5" strokeWidth={1.8} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800">
        <Loader2 className="w-8 h-8 text-[#0f5132] animate-spin" />
      </div>
    }>
      <CustomerStateLoader>{children}</CustomerStateLoader>
    </Suspense>
  );
}
