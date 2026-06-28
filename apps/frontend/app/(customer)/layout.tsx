"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCustomerStore } from "../../lib/store/customer-store";
import { getCustomerMenu } from "../../lib/api/customer";
import Link from "next/link";

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
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);

  // Get token from URL
  const tokenFromUrl = searchParams.get("token");

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
            setSessionEnded(true);
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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-400 text-sm animate-pulse">Loading Digital Menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-md bg-neutral-900 border border-red-500/20 rounded-3xl p-8 shadow-xl">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-neutral-400 text-sm mb-6">{error}</p>
          <p className="text-xs text-neutral-600">Please re-scan the physical QR code placed at your table.</p>
        </div>
      </div>
    );
  }

  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center">
        <div className="max-w-md bg-neutral-900 border border-amber-500/20 rounded-3xl p-8 shadow-xl space-y-6">
          <div className="text-5xl">🍽️</div>
          <h1 className="text-xl font-bold text-amber-500">Dining Session Ended</h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            This dining session has been finalized and closed by the cashier. Thank you for dining with us!
          </p>
          <button
            onClick={() => {
              useCustomerStore.getState().clearSession();
              setSessionEnded(false);
              router.push(`/qr/${activeToken}`);
            }}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-2xl text-sm transition-all"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  if (showWelcomeBack && restaurant && table && activeSessionData) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans text-center relative">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.05)_0%,transparent_60%)] pointer-events-none"></div>
        <div className="max-w-md w-full bg-neutral-900 border border-amber-500/20 rounded-3xl p-8 shadow-2xl space-y-6 z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3.5 py-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
            👋 Welcome Back{guestName ? `, ${guestName}` : ""}
          </div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-black">{restaurant.name}</h1>
            <p className="text-neutral-500 text-xs">Table {table.tableNumber} · {table.tableName}</p>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 space-y-3.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 font-semibold">Dining Session</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            
            <div className="border-t border-neutral-850 pt-3 flex justify-between items-center">
              <span className="text-neutral-400 text-xs font-medium">Consolidated Bill</span>
              <span className="text-lg font-black text-amber-500">
                {restaurant.currency} {Number(activeSessionData.totalAmount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                setShowWelcomeBack(false);
                // Remove welcome parameter from URL without page reload
                const url = new URL(window.location.href);
                url.searchParams.delete("welcome");
                window.history.replaceState({}, "", url.toString());
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-2xl text-sm transition-all hover:scale-[1.01] active:scale-95"
            >
              Continue Ordering
            </button>
            <Link
              href={`/my-orders?token=${activeToken}`}
              onClick={() => setShowWelcomeBack(false)}
              className="w-full py-3.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 font-bold rounded-2xl text-sm block border border-neutral-700/30 transition-all hover:scale-[1.01] active:scale-95"
            >
              View My Orders
            </Link>
            <Link
              href={`/bill?token=${activeToken}`}
              onClick={() => setShowWelcomeBack(false)}
              className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-300 font-semibold rounded-2xl text-xs block transition-all"
            >
              View Table Bill
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

  // Check active path for styling
  const isMenu = pathname.startsWith("/menu");
  const isCart = pathname.startsWith("/cart");
  const isOrders = pathname.startsWith("/my-orders") || pathname.startsWith("/order-tracking") || pathname.startsWith("/order-success");
  const isBill = pathname.startsWith("/bill");

  return (
    <div className={`min-h-screen ${isDark ? "bg-neutral-950 text-white" : "bg-neutral-50 text-neutral-900"} flex justify-center font-sans transition-colors duration-300`}>
      <div className={`w-full max-w-md ${isDark ? "bg-neutral-900 border-neutral-800" : "bg-white border-neutral-200"} min-h-screen shadow-2xl flex flex-col relative border-x`}>
        {/* Customer Header */}
        <header className={`px-4 py-3 border-b ${isDark ? "bg-neutral-900/80 border-neutral-800" : "bg-white/80 border-neutral-200"} flex justify-between items-center sticky top-0 z-50 backdrop-blur-md`}>
          <Link href={`/menu?token=${activeToken}`} className="flex items-center space-x-3">
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="h-9 w-9 rounded-xl object-cover bg-neutral-100 border border-neutral-200"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center text-neutral-950 font-bold text-lg">
                {restaurant?.name?.charAt(0) || "R"}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-none">{restaurant?.name || "Restaurant Menu"}</span>
              {table && (
                <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider mt-0.5">
                  Table {table.tableNumber}
                </span>
              )}
            </div>
          </Link>
          
          <Link
            href={`/cart?token=${activeToken}`}
            className={`relative p-2 rounded-xl transition-all ${isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-100"}`}
          >
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-amber-500 text-neutral-950 rounded-full font-extrabold text-[10px] w-5 h-5 flex items-center justify-center animate-bounce">
                {cartCount}
              </span>
            )}
          </Link>
        </header>

        {/* Customer View Content */}
        <main className="flex-1 overflow-y-auto pb-10">
          {children}
        </main>

        {/* Customer Sticky Bottom Navigation */}
        <nav className={`border-t px-6 py-2.5 flex justify-between items-center sticky bottom-0 z-50 backdrop-blur-md ${
          isDark ? "bg-neutral-900/90 border-neutral-800" : "bg-white/90 border-neutral-200"
        }`}>
          <Link
            href={`/menu?token=${activeToken}`}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              isMenu ? "text-amber-500" : "text-neutral-500 hover:text-amber-400"
            }`}
          >
            <span className="text-xl">📋</span>
            <span className="text-[9px] font-black uppercase tracking-wider">Menu</span>
          </Link>
          <Link
            href={`/cart?token=${activeToken}`}
            className={`flex flex-col items-center space-y-1 transition-colors relative ${
              isCart ? "text-amber-500" : "text-neutral-500 hover:text-amber-400"
            }`}
          >
            <span className="text-xl">🛒</span>
            <span className="text-[9px] font-black uppercase tracking-wider">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-amber-500 text-neutral-950 rounded-full font-black text-[9px] w-4.5 h-4.5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link
            href={`/my-orders?token=${activeToken}`}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              isOrders ? "text-amber-500" : "text-neutral-500 hover:text-amber-400"
            }`}
          >
            <span className="text-xl">🍔</span>
            <span className="text-[9px] font-black uppercase tracking-wider">My Orders</span>
          </Link>
          <Link
            href={`/bill?token=${activeToken}`}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              isBill ? "text-amber-500" : "text-neutral-500 hover:text-amber-400"
            }`}
          >
            <span className="text-xl">🧾</span>
            <span className="text-[9px] font-black uppercase tracking-wider">Table Bill</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CustomerStateLoader>{children}</CustomerStateLoader>
    </Suspense>
  );
}
