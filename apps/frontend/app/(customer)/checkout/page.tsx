"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { validateCustomerCart, createCustomerOrder } from "../../../lib/api/customer";
import Link from "next/link";
import {
  User,
  Phone,
  MessageSquare,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const cart = useCustomerStore((state) => state.cart);
  const restaurant = useCustomerStore((state) => state.restaurant);
  const table = useCustomerStore((state) => state.table);
  const clearCart = useCustomerStore((state) => state.clearCart);
  const guestId = useCustomerStore((state) => state.guestId);
  const guestName = useCustomerStore((state) => state.guestName);
  const guestPhone = useCustomerStore((state) => state.guestPhone);
  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "light";

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
      <div className="min-h-screen bg-[#faf9f6] p-5 space-y-5 animate-pulse">
        <div className="h-6 w-1/3 bg-slate-200/60 rounded-lg"></div>
        <div className="h-28 w-full bg-white border border-neutral-100 rounded-3xl"></div>
        <div className="h-40 w-full bg-white border border-neutral-100 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#faf9f6]/90 border-b border-black/[0.03]">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href={`/cart?token=${token}`}
            className="w-10 h-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center transition-all duration-200 active:scale-[0.97] shadow-sm"
          >
            <ArrowLeft className="w-[18px] h-[18px] text-slate-500" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-black text-slate-800 tracking-tight">Checkout</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              Table {table?.tableNumber || ""} · {table?.tableName || ""}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#0f5132]/8 flex items-center justify-center">
            <ShieldCheck className="w-[18px] h-[18px] text-[#0f5132]" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 animate-fade-up">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 leading-relaxed font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Guest Info Card */}
          {guestId ? (
            <div className="bg-white rounded-3xl border border-neutral-100 p-5 shadow-[0_6px_20px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#0f5132]/8 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#0f5132]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Ordering As
                  </span>
                  <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{customerName}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{customerPhone}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-neutral-100 p-5 space-y-4 shadow-[0_6px_20px_rgba(0,0,0,0.01)]">
              {/* Section Header */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-50">
                <div className="w-8 h-8 rounded-full bg-[#0f5132]/8 flex items-center justify-center text-[#0f5132]">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Contact Details</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Optional info for session bill tracking</p>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="E.g., John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132]/20 transition-all duration-200"
                />
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="E.g., +919876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132]/20 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Order Notes Card */}
          <div className="bg-white rounded-3xl border border-neutral-100 p-5 space-y-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0f5132]/8 flex items-center justify-center text-[#0f5132]">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">Order Notes</h3>
            </div>
            <textarea
              rows={2}
              placeholder="E.g., Make it extra spicy, serve drinks first..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132]/20 transition-all duration-200 resize-none"
            />
          </div>

          {/* Estimated Time Card */}
          <div className="bg-white rounded-3xl border border-[#0f5132]/10 p-5 flex items-center gap-4 shadow-[0_6px_20px_rgba(0,0,0,0.015)]">
            <div className="w-11 h-11 rounded-full bg-[#0f5132]/8 flex items-center justify-center flex-shrink-0 text-[#0f5132]">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-extrabold text-[#0f5132] uppercase tracking-wider">
                Estimated Wait Time
              </div>
              <div className="text-sm font-bold text-slate-700 mt-0.5">
                Ready in ~ {estimatedPrepTime} mins
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          {validatedData && (
            <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.015)]">
              {/* Summary Header */}
              <div className="px-5 py-3 border-b border-neutral-50 bg-slate-50/20">
                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Payment Summary
                </h3>
              </div>

              {/* Summary Rows */}
              <div className="px-5 py-4 space-y-3 border-b border-neutral-100">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Subtotal</span>
                  <span className="text-slate-700 font-bold tabular-nums">
                    {currency} {Number(validatedData.subtotal).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">GST / Taxes</span>
                  <span className="text-slate-700 font-bold tabular-nums">
                    {currency} {Number(validatedData.tax).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="px-5 py-4 bg-slate-50/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">Grand Total</span>
                  <span className="text-base font-black text-[#0f5132] tabular-nums">
                    {currency} {Number(validatedData.grandTotal).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Place Order Button */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={submitting || !validatedData}
              className={`w-full py-4 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-2xl transition-all duration-200 shadow-md shadow-[#0f5132]/10 flex items-center justify-center gap-2 ${
                submitting || !validatedData
                  ? "opacity-50 pointer-events-none"
                  : "active:scale-[0.97]"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <span>Place Table Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Edit Cart Link */}
            <Link
              href={`/cart?token=${token}`}
              className="w-full py-3.5 bg-white border border-neutral-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Cart</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
