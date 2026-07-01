"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { validateCustomerCart } from "../../../lib/api/customer";
import Link from "next/link";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  UtensilsCrossed,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function CartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const cart = useCustomerStore((state) => state.cart);
  const restaurant = useCustomerStore((state) => state.restaurant);
  const updateQuantity = useCustomerStore((state) => state.updateQuantity);
  const removeFromCart = useCustomerStore((state) => state.removeFromCart);
  const clearCart = useCustomerStore((state) => state.clearCart);
  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "light";

  // State for server-validated totals
  const [validatedData, setValidatedData] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate cart against server whenever cart changes
  useEffect(() => {
    if (!token || cart.length === 0) {
      setValidatedData(null);
      return;
    }

    const validateCartOnServer = async () => {
      try {
        setValidating(true);
        setValidationError(null);
        
        // Map cart store items to CartItemInput DTO
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
          setValidationError("Could not validate the cart pricing.");
        }
      } catch (err: any) {
        setValidationError(err.response?.data?.message || err.message || "Pricing verification failed.");
      } finally {
        setValidating(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      validateCartOnServer();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [cart, token]);

  if (cart.length === 0) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-6 py-12 bg-[#faf9f6] text-slate-800 font-sans">
        <div className="flex flex-col items-center gap-6 max-w-xs text-center animate-fade-up">
          {/* Empty cart icon */}
          <div className="w-20 h-20 rounded-full bg-white border border-neutral-100 flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Your Cart is Empty</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browse our delicious digital menu and customize dishes to place your table order.
            </p>
          </div>

          <Link
            href={`/menu?token=${token}`}
            className="inline-flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition-all duration-200 active:scale-[0.97] shadow-sm shadow-[#0f5132]/10"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 font-sans pb-48">
      <div className="px-4 pt-5 space-y-5 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#0f5132]/8 border border-[#0f5132]/10 flex items-center justify-center">
                <ShoppingCart className="w-4.5 h-4.5 text-[#0f5132]" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-800 tracking-tight">Your Cart</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {cart.length} {cart.length === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-1 text-[11px] font-extrabold text-red-600 hover:text-red-700 px-3 py-2 rounded-xl transition-all duration-200 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>

        {/* Cart Items List */}
        <div className="space-y-3.5">
          {cart.map((item, index) => (
            <div
              key={`${item.menuItemId}-${item.variantId}-${index}`}
              className="bg-white border border-neutral-100 rounded-[20px] overflow-hidden transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-neutral-200"
            >
              <div className="p-4">
                <div className="flex gap-3.5">
                  {/* Image */}
                  <div className="w-[72px] h-[72px] rounded-xl bg-slate-50 border border-neutral-100 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Title & Customization Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h4 className="font-bold text-sm text-slate-800 truncate leading-tight">
                      {item.name}
                    </h4>

                    {/* Variant */}
                    {item.variantName && (
                      <span className="inline-flex items-center text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#0f5132]/6 text-[#0f5132] border border-[#0f5132]/10 uppercase tracking-wider">
                        {item.variantName}
                      </span>
                    )}

                    {/* Addons */}
                    {item.addonsList && item.addonsList.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.addonsList.map((addon) => (
                          <span
                            key={addon.id}
                            className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-neutral-100 px-1.5 py-0.5 rounded-full"
                          >
                            + {addon.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-[10px] italic text-slate-400 truncate leading-snug">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Item price */}
                  <div className="text-right flex-shrink-0 pt-0.5">
                    <span className="text-sm font-black text-[#0f5132] tabular-nums">
                      {currency} {((item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom bar: Remove + Quantity */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 bg-slate-50/50">
                <button
                  onClick={() => removeFromCart(index)}
                  className="flex items-center gap-1 text-[11px] font-extrabold text-slate-400 hover:text-red-500 transition-all duration-200 active:scale-[0.97]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>

                <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5 shadow-sm">
                  <button
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 transition-all duration-200 active:scale-[0.97]"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-slate-700 tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#0f5132] hover:text-[#0d472c] hover:bg-[#0f5132]/5 transition-all duration-200 active:scale-[0.97]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary Block */}
        <div className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
          <div className="px-4 py-3 border-b border-neutral-50 bg-slate-50/30">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">
              Order Summary
            </h3>
          </div>

          <div className="p-4 space-y-3">
            {validating && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-[#0f5132] animate-spin" />
                <span className="text-xs text-slate-400 font-medium">Updating prices…</span>
              </div>
            )}

            {validationError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-500 leading-relaxed font-semibold">{validationError}</span>
              </div>
            )}

            {validatedData ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Subtotal</span>
                  <span className="text-slate-700 font-bold tabular-nums">
                    {currency} {Number(validatedData.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Taxes</span>
                  <span className="text-slate-700 font-bold tabular-nums">
                    {currency} {Number(validatedData.tax).toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-neutral-100 pt-3.5 flex justify-between items-center">
                  <span className="text-sm font-black text-slate-800">Grand Total</span>
                  <span className="text-base font-black text-[#0f5132] tabular-nums">
                    {currency} {Number(validatedData.grandTotal).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400">Estimated Total</span>
                <span className="text-sm font-black text-slate-700 tabular-nums">
                  {currency} {cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/80 border-t border-neutral-100 px-4 py-4 space-y-2.5 shadow-[0_-4px_25px_rgba(0,0,0,0.015)]">
        <Link
          href={`/checkout?token=${token}`}
          className={`w-full py-4 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 ${
            validationError || validating
              ? "opacity-40 pointer-events-none"
              : "active:scale-[0.97] shadow-sm shadow-[#0f5132]/10"
          }`}
        >
          Proceed to Checkout
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href={`/menu?token=${token}`}
          className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-extrabold text-slate-500 rounded-2xl border border-neutral-200/60 bg-white hover:bg-slate-50 transition-all duration-200 active:scale-[0.97]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Continue Adding Food
        </Link>
      </div>
    </div>
  );
}
