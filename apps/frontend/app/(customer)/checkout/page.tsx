"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { validateCustomerCart, createCustomerOrder } from "../../../lib/api/customer";
import Link from "next/link";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const { cart, restaurant, table, clearCart, guestId, guestName, guestPhone } = useCustomerStore();
  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Pre-populate if guest details already exist
  useEffect(() => {
    if (guestName) setCustomerName(guestName);
    if (guestPhone) setCustomerPhone(guestPhone);
  }, [guestName, guestPhone]);

  // Validation & Submit states
  const [validatedData, setValidatedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate cart on load to get tax and grand total
  useEffect(() => {
    if (!token || cart.length === 0) {
      router.push(`/menu?token=${token || ""}`);
      return;
    }

    const loadValidation = async () => {
      try {
        setLoading(true);
        setError(null);
        const itemsDto = cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          variantId: item.variantId,
          addonIds: item.addonIds,
          notes: item.notes,
        }));

        const res = await validateCustomerCart(token, itemsDto);
        if (res.success && res.data) {
          setValidatedData(res.data);
        } else {
          setError("Failed to validate order pricing.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load pricing breakdown.");
      } finally {
        setLoading(false);
      }
    };

    loadValidation();
  }, [cart, token, router]);

  // Max prep time of items in the cart
  const estimatedPrepTime = useMemo(() => {
    if (cart.length === 0) return 0;
    
    // We get categories menuItems from store to find matching prep times
    let maxTime = 15; // default fallback
    cart.forEach((cartItem) => {
      // Find item in categories
      useCustomerStore.getState().categories.forEach((cat) => {
        const item = cat.menuItems.find((i: any) => i.id === cartItem.menuItemId);
        if (item && item.preparationTime > maxTime) {
          maxTime = item.preparationTime;
        }
      });
    });
    return maxTime;
  }, [cart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || cart.length === 0 || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const itemsDto = cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        variantId: item.variantId,
        addonIds: item.addonIds,
        notes: item.notes,
      }));

      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: itemsDto,
      };

      const res = await createCustomerOrder(token, payload);
      
      if (res.success && res.data) {
        const orderId = res.data.id;
        const sessionId = res.data.sessionId || (res.data.session && res.data.session.id);
        const returnedCustomer = res.data.customer;
        
        // Record guest details
        if (returnedCustomer) {
          useCustomerStore.getState().setGuest({
            id: returnedCustomer.id,
            name: returnedCustomer.name,
            phone: returnedCustomer.phone
          });
        }

        // Record order and session
        useCustomerStore.getState().addOrderId(orderId);
        if (sessionId) {
          useCustomerStore.getState().setSessionId(sessionId);
        }

        // Clear customer cart
        clearCart();
        // Redirect to order success
        router.push(`/order-success/${orderId}?token=${token}`);
      } else {
        setError("Failed to place order. Please try again.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred while placing your order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 w-1/3 bg-neutral-800 rounded"></div>
        <div className="h-24 w-full bg-neutral-800 rounded-2xl"></div>
        <div className="h-36 w-full bg-neutral-800 rounded-2xl"></div>
        <div className="h-14 w-full bg-neutral-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
          Table {table?.tableNumber || ""} · {table?.tableName || ""}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info (Optional) */}
        {guestId ? (
          <div className={`p-5 rounded-2xl border ${
            isDark ? "bg-neutral-900/40 border-neutral-800" : "bg-neutral-50 border-neutral-100"
          }`}>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Ordering As</span>
            <div className="text-sm font-extrabold text-white mt-1">{customerName}</div>
            <div className="text-xs text-neutral-400 mt-0.5">{customerPhone}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">Contact Details (Optional)</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Your Name</label>
                <input
                  type="text"
                  placeholder="E.g., John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full p-3.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
                    isDark
                      ? "bg-neutral-850 border-neutral-800 text-white placeholder-neutral-600 focus:border-amber-500"
                      : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="E.g., +919876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={`w-full p-3.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
                    isDark
                      ? "bg-neutral-850 border-neutral-800 text-white placeholder-neutral-600 focus:border-amber-500"
                      : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500"
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Order Notes */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500">Order Notes</h3>
          <textarea
            rows={2}
            placeholder="Special instructions for this entire order..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`w-full p-3.5 text-sm rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
              isDark
                ? "bg-neutral-850 border-neutral-800 text-white placeholder-neutral-600 focus:border-amber-500"
                : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500"
            }`}
          />
        </div>

        {/* Estimated Time Info */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
          isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-500/5 border-amber-550/10"
        }`}>
          <span className="text-2xl">⏱️</span>
          <div>
            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">Estimated Wait Time</div>
            <div className="text-sm font-semibold mt-0.5">Ready in approximately {estimatedPrepTime} mins</div>
          </div>
        </div>

        {/* Order Breakdown */}
        {validatedData && (
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-neutral-50 border-neutral-100"
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800/10 dark:border-neutral-800 pb-2">
              Payment Summary
            </h3>
            
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Subtotal</span>
              <span>{currency} {Number(validatedData.subtotal).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">GST / Taxes</span>
              <span>{currency} {Number(validatedData.tax).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm font-extrabold border-t border-neutral-850 dark:border-neutral-800 pt-3">
              <span>Grand Total</span>
              <span className="text-amber-500">{currency} {Number(validatedData.grandTotal).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting || !validatedData}
          className={`w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-base rounded-2xl transition-all shadow-lg shadow-amber-500/10 ${
            submitting || !validatedData ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95"
          }`}
        >
          {submitting ? "Placing Order..." : `Place Table Order`}
        </button>

        <Link
          href={`/cart?token=${token}`}
          className={`w-full py-4 text-center text-xs font-bold rounded-2xl block transition-all ${
            isDark ? "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-550"
          }`}
        >
          ← Edit Cart
        </Link>
      </form>
    </div>
  );
}
