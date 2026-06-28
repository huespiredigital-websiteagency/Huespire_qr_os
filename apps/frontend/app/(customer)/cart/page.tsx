"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../lib/store/customer-store";
import { validateCustomerCart } from "../../../lib/api/customer";
import Link from "next/link";

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
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

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
      <div className="p-6 text-center space-y-6 flex flex-col items-center justify-center min-h-[70vh]">
        <span className="text-6xl animate-bounce">🛒</span>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Your Cart is Empty</h2>
          <p className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-500"} max-w-xs`}>
            Add delicious items from the digital menu to place your table order.
          </p>
        </div>
        <Link
          href={`/menu?token=${token}`}
          className="bg-amber-500 text-neutral-950 font-bold px-8 py-3 rounded-2xl text-sm transition-all hover:scale-[1.02]"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black">Shopping Cart</h1>
          <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"} mt-0.5`}>
            Confirm your items before sending to the kitchen
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-500 font-bold hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-4">
        {cart.map((item, index) => (
          <div
            key={`${item.menuItemId}-${item.variantId}-${index}`}
            className={`p-4 rounded-3xl border flex flex-col gap-3 ${
              isDark ? "bg-neutral-900/50 border-neutral-800" : "bg-white border-neutral-100 shadow-sm"
            }`}
          >
            <div className="flex gap-4">
              {/* Image */}
              <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-500">
                    No image
                  </div>
                )}
              </div>

              {/* Title & Customization Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm truncate">{item.name}</h4>
                
                {/* Variant */}
                {item.variantName && (
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 mr-1.5 ${
                    isDark ? "bg-neutral-800 text-amber-500" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    Size: {item.variantName}
                  </span>
                )}

                {/* Addons */}
                {item.addonsList && item.addonsList.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.addonsList.map((addon) => (
                      <span
                        key={addon.id}
                        className="text-[9px] bg-neutral-800 text-neutral-400 border border-neutral-700/30 px-1.5 py-0.5 rounded-md"
                      >
                        + {addon.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-[10px] italic text-neutral-500 mt-2 truncate">
                    💬 "{item.notes}"
                  </p>
                )}
              </div>

              {/* Item price */}
              <div className="text-right">
                <span className="text-sm font-extrabold text-amber-500">
                  {currency} {((item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quantity Selector and Delete */}
            <div className="flex items-center justify-between border-t border-neutral-800/10 dark:border-neutral-800 pt-3">
              <button
                onClick={() => removeFromCart(index)}
                className="text-xs text-neutral-500 hover:text-red-500 transition-colors"
              >
                🗑️ Remove
              </button>

              <div className={`flex items-center gap-2 border rounded-xl p-0.5 ${
                isDark ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200"
              }`}>
                <button
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  className={`w-7 h-7 flex items-center justify-center font-bold rounded-lg ${
                    isDark ? "hover:bg-neutral-700" : "hover:bg-neutral-200"
                  }`}
                >
                  -
                </button>
                <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  className={`w-7 h-7 flex items-center justify-center font-bold rounded-lg ${
                    isDark ? "hover:bg-neutral-700" : "hover:bg-neutral-200"
                  }`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Summary Block */}
      <div className={`p-5 rounded-3xl border space-y-3 ${
        isDark ? "bg-neutral-900/30 border-neutral-800" : "bg-neutral-50 border-neutral-100"
      }`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-800/10 dark:border-neutral-800 pb-2">
          Order Summary
        </h3>

        {validating && (
          <div className="py-2 flex items-center justify-center gap-2 text-xs text-neutral-400">
            <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
            Recalculating price snapshots...
          </div>
        )}

        {validationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs">
            ⚠️ {validationError}
          </div>
        )}

        {validatedData ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Subtotal</span>
              <span>{currency} {Number(validatedData.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Taxes</span>
              <span>{currency} {Number(validatedData.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold border-t border-neutral-800/10 dark:border-neutral-800 pt-3">
              <span>Grand Total</span>
              <span className="text-amber-500">{currency} {Number(validatedData.grandTotal).toFixed(2)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-sm font-extrabold">
            <span>Subtotal Estimate</span>
            <span>
              {currency} {cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Checkout Buttons */}
      <div className="space-y-3 pt-2">
        <Link
          href={`/checkout?token=${token}`}
          className={`w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-base rounded-2xl block text-center transition-all ${
            validationError || validating ? "opacity-50 pointer-events-none" : "hover:scale-[1.01] active:scale-95 shadow-lg shadow-amber-500/10"
          }`}
        >
          Proceed to Checkout →
        </Link>

        <Link
          href={`/menu?token=${token}`}
          className={`w-full py-4 text-center text-xs font-bold rounded-2xl block transition-all ${
            isDark ? "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          ← Continue Adding Food
        </Link>
      </div>
    </div>
  );
}
