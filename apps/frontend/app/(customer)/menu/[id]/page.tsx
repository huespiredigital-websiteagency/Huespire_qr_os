"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../../lib/store/customer-store";
import { getCustomerMenuItem } from "../../../../lib/api/customer";
import Link from "next/link";

export default function FoodDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const token = searchParams.get("token");

  const restaurant = useCustomerStore((state) => state.restaurant);
  const addons = useCustomerStore((state) => state.addons);
  const addToCart = useCustomerStore((state) => state.addToCart);
  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "dark";
  const isDark = theme === "dark";

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selector states
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!token || !id) return;

    const fetchItem = async () => {
      try {
        setLoading(true);
        const res = await getCustomerMenuItem(token, id);
        if (res.success && res.data) {
          setItem(res.data);
          // Set default variant if available
          if (res.data.variants && res.data.variants.length > 0) {
            setSelectedVariantId(res.data.variants[0].id);
          }
        } else {
          setError("Item not found");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Failed to load item details.");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, token]);

  // Available addons for this specific item
  const availableAddons = useMemo(() => {
    return item?.addons || addons || [];
  }, [item, addons]);

  // Live Price Calculation
  const livePrice = useMemo(() => {
    if (!item) return 0;
    
    let basePrice = Number(item.price);
    
    // If has variants, use selected variant price
    if (item.variants && item.variants.length > 0 && selectedVariantId) {
      const variant = item.variants.find((v: any) => v.id === selectedVariantId);
      if (variant) {
        basePrice = Number(variant.price);
      }
    }

    // Add selected addons price
    let addonsPrice = 0;
    selectedAddonIds.forEach((addonId) => {
      const addon = availableAddons.find((a: any) => a.id === addonId);
      if (addon) {
        addonsPrice += Number(addon.additionalPrice);
      }
    });

    return (basePrice + addonsPrice) * quantity;
  }, [item, selectedVariantId, selectedAddonIds, quantity, availableAddons]);

  const handleAddonToggle = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId)
        ? prev.filter((id) => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddToCart = () => {
    if (!item || !token) return;

    // Get variant name if selected
    let variantName = null;
    let basePrice = Number(item.price);
    if (item.variants && item.variants.length > 0 && selectedVariantId) {
      const variant = item.variants.find((v: any) => v.id === selectedVariantId);
      if (variant) {
        variantName = variant.name;
        basePrice = Number(variant.price);
      }
    }

    // Map addon details
    const selectedAddonsList = selectedAddonIds.map((addonId) => {
      const addon = availableAddons.find((a: any) => a.id === addonId);
      return {
        id: addon ? addon.id : addonId,
        name: addon ? addon.name : "Addon",
        price: addon ? Number(addon.additionalPrice) : 0,
      };
    });

    const itemPrice = basePrice + selectedAddonsList.reduce((sum, a) => sum + a.price, 0);

    const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";

    addToCart({
      menuItemId: item.id,
      name: item.name,
      quantity,
      price: itemPrice,
      image: primaryImg,
      variantId: selectedVariantId,
      variantName,
      addonIds: selectedAddonIds,
      addonsList: selectedAddonsList,
      notes: notes.trim() || null,
    });

    // Go back to menu
    router.push(`/menu?token=${token}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="w-full h-64 rounded-3xl bg-neutral-800"></div>
        <div className="h-6 w-1/3 bg-neutral-800 rounded"></div>
        <div className="h-4 w-full bg-neutral-800 rounded"></div>
        <div className="h-4 w-5/6 bg-neutral-800 rounded"></div>
        <div className="space-y-3 pt-4">
          <div className="h-4 w-1/4 bg-neutral-800 rounded"></div>
          <div className="h-10 w-full bg-neutral-800 rounded-xl"></div>
          <div className="h-10 w-full bg-neutral-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 text-center space-y-4">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-bold text-red-500">Error Loading Food Item</h2>
        <p className={`text-sm ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>{error || "Item details could not be retrieved."}</p>
        <Link
          href={`/menu?token=${token}`}
          className="inline-block bg-amber-500 text-neutral-950 font-bold px-6 py-2.5 rounded-xl text-sm"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";

  return (
    <div className="flex flex-col">
      {/* Top Banner with Image and Back button */}
      <div className="relative w-full h-72 bg-neutral-800">
        {primaryImg ? (
          <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500">
            No Image Available
          </div>
        )}
        <Link
          href={`/menu?token=${token}`}
          className="absolute top-4 left-4 bg-neutral-950/70 hover:bg-neutral-950 text-white rounded-full p-2.5 backdrop-blur-md transition-all"
        >
          ← Back
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Title, Dietary Tag, calories */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {item.isVeg ? (
              <span className="w-3.5 h-3.5 border border-emerald-600 rounded-sm p-[1.5px] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </span>
            ) : (
              <span className="w-3.5 h-3.5 border border-red-600 rounded-sm p-[1.5px] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              </span>
            )}
            {item.isVegan && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                Vegan
              </span>
            )}
            {item.isSpicy && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-500 flex items-center gap-0.5">
                🌶️ Spicy
              </span>
            )}
            {item.calories && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                {item.calories} Calories
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-black">{item.name}</h1>
          <p className={`text-sm leading-relaxed ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>
            {item.description || "Indulge in our freshly made, high-quality dish prepared with handpicked ingredients."}
          </p>

          <div className="flex gap-4 pt-1 text-xs text-neutral-400">
            <span>⏱️ Prep Time: <strong>{item.preparationTime} mins</strong></span>
          </div>
        </div>

        {/* Variants Selection */}
        {item.variants && item.variants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">Choose Variant</h3>
              <span className="text-[11px] text-neutral-500">Required (Select 1)</span>
            </div>
            <div className="space-y-2">
              {item.variants.map((v: any) => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedVariantId === v.id
                      ? "border-amber-500 bg-amber-500/5 font-bold"
                      : isDark
                      ? "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/20"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant"
                      value={v.id}
                      checked={selectedVariantId === v.id}
                      onChange={() => setSelectedVariantId(v.id)}
                      className="accent-amber-500 h-4.5 w-4.5"
                    />
                    <span className="text-sm">{v.name}</span>
                  </div>
                  <span className="text-sm font-extrabold text-amber-500">
                    {currency} {Number(v.price).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Selection */}
        {availableAddons && availableAddons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">Add Extras</h3>
              <span className="text-[11px] text-neutral-500">Optional</span>
            </div>
            <div className="space-y-2">
              {availableAddons.map((addon: any) => (
                <label
                  key={addon.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedAddonIds.includes(addon.id)
                      ? "border-amber-500 bg-amber-500/5 font-bold"
                      : isDark
                      ? "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/20"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedAddonIds.includes(addon.id)}
                      onChange={() => handleAddonToggle(addon.id)}
                      className="accent-amber-500 h-4.5 w-4.5 rounded"
                    />
                    <span className="text-sm">{addon.name}</span>
                  </div>
                  <span className="text-sm font-extrabold text-neutral-400">
                    + {currency} {Number(addon.additionalPrice).toFixed(2)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">Special Instructions</h3>
          <textarea
            rows={3}
            placeholder="E.g., No onions, extra spicy, sauce on the side..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`w-full p-4 text-sm rounded-2xl border focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
              isDark
                ? "bg-neutral-800 border-neutral-700 text-white placeholder-neutral-550 focus:border-amber-500"
                : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500"
            }`}
          />
        </div>

        {/* Quantity and Checkout Row */}
        <div className="flex gap-4 items-center pt-4 border-t border-neutral-800/10 dark:border-neutral-800">
          {/* Quantity selector */}
          <div className={`flex items-center gap-3 border rounded-2xl p-1 ${
            isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-200"
          }`}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className={`w-10 h-10 flex items-center justify-center font-bold text-lg rounded-xl transition-all ${
                isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-200"
              }`}
            >
              -
            </button>
            <span className="w-6 text-center font-extrabold text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className={`w-10 h-10 flex items-center justify-center font-bold text-lg rounded-xl transition-all ${
                isDark ? "hover:bg-neutral-800" : "hover:bg-neutral-200"
              }`}
            >
              +
            </button>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            className="flex-1 py-4 px-6 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-base rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10 text-center"
          >
            Add to Cart · {currency} {livePrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
