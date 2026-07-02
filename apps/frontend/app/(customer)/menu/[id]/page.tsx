"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useCustomerStore } from "../../../../lib/store/customer-store";
import { getCustomerMenuItem } from "../../../../lib/api/customer";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  Clock,
  Flame,
  Leaf,
  Check,
  AlertTriangle,
  UtensilsCrossed,
  MessageSquare,
  Loader2,
} from "lucide-react";

export default function FoodDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const token = searchParams.get("token");

  const setToken = useCustomerStore((state) => state.setToken);

  // Check if "id" parameter is a 32-character hex QR token
  const isQrToken = useMemo(() => {
    return id && /^[a-fA-F0-9]{32}$/.test(id);
  }, [id]);

  useEffect(() => {
    if (isQrToken) {
      setToken(id);
      router.replace("/menu");
    }
  }, [isQrToken, id, setToken, router]);

  const restaurant = useCustomerStore((state) => state.restaurant);
  const addons = useCustomerStore((state) => state.addons);
  const addToCart = useCustomerStore((state) => state.addToCart);
  const currency = restaurant?.currency || "INR";
  const theme = restaurant?.theme || "light";

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

  if (isQrToken) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <Loader2 className="w-8 h-8 text-[#0f5132] animate-spin" />
      </div>
    );
  }

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
      <div className="p-5 space-y-5 animate-pulse bg-[#faf9f6]">
        <div className="w-full h-64 rounded-3xl bg-slate-200/60"></div>
        <div className="space-y-3">
          <div className="h-5 w-2/5 bg-slate-200/60 rounded-lg"></div>
          <div className="h-7 w-3/4 bg-slate-200/60 rounded-lg"></div>
          <div className="h-4 w-full bg-slate-200/60 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 text-center space-y-5 flex flex-col items-center justify-center min-h-[60vh] bg-[#faf9f6]">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-800">Error Loading Item</h2>
          <p className="text-sm text-slate-400">{error || "Item details could not be retrieved."}</p>
        </div>
        <Link
          href={`/menu?token=${token}`}
          className="inline-flex items-center gap-2 bg-[#0f5132] text-white font-bold px-6 py-3 rounded-xl text-sm transition-all duration-200 active:scale-[0.97]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </Link>
      </div>
    );
  }

  const primaryImg = item.images?.find((img: any) => img.isPrimary)?.imageUrl || item.imageUrl || "";

  return (
    <div className="flex flex-col bg-[#faf9f6] min-h-screen text-slate-800 pb-20 font-sans">
      {/* Hero Image Section */}
      <div className="relative w-full h-72 bg-slate-100">
        {primaryImg ? (
          <>
            <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f6] via-transparent to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <UtensilsCrossed className="w-10 h-10 text-slate-300" />
            <span className="text-xs font-semibold">No Image Available</span>
          </div>
        )}
        <Link
          href={`/menu?token=${token}`}
          className="absolute top-4 left-4 bg-white/80 hover:bg-white text-slate-700 rounded-full p-2.5 backdrop-blur-md transition-all duration-200 active:scale-95 border border-black/[0.04] shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="p-5 space-y-6 -mt-6 relative z-10">
        {/* Item Info */}
        <div className="bg-white border border-neutral-100 p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-3.5">
          {/* Dietary Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.isVeg ? (
              <span className="w-4 h-4 border-[1.5px] border-emerald-500 rounded-[3px] p-[2px] flex items-center justify-center">
                <span className="w-full h-full rounded-full bg-emerald-500"></span>
              </span>
            ) : (
              <span className="w-4 h-4 border-[1.5px] border-red-500 rounded-[3px] p-[2px] flex items-center justify-center">
                <span className="w-full h-full rounded-full bg-red-500"></span>
              </span>
            )}
            {item.isVegan && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                <Leaf className="w-3 h-3" />
                Vegan
              </span>
            )}
            {item.isSpicy && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-100">
                <Flame className="w-3 h-3" />
                Spicy
              </span>
            )}
            {item.calories && (
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-neutral-100">
                {item.calories} cal
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-black tracking-tight text-slate-850">{item.name}</h1>
          <p className="text-sm leading-relaxed text-slate-500">
            {item.description || "Indulge in our freshly made, high-quality dish prepared with handpicked ingredients."}
          </p>

          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 pt-1.5 border-t border-neutral-50 w-full">
            <Clock className="w-4 h-4 text-[#0f5132]" />
            <span>Prep Time: <strong className="text-slate-700 font-bold">{item.preparationTime} mins</strong></span>
          </div>
        </div>

        {/* Variants Selection */}
        {item.variants && item.variants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Choose Variant</h3>
              <span className="text-[9px] text-[#0f5132] bg-[#0f5132]/5 px-2.5 py-0.5 rounded-full border border-[#0f5132]/10 font-bold">Required</span>
            </div>
            <div className="space-y-2">
              {item.variants.map((v: any) => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                    selectedVariantId === v.id
                      ? "border-[#0f5132]/35 bg-[#0f5132]/5 font-bold"
                      : "border-neutral-100 bg-white hover:bg-slate-50 shadow-[0_4px_15px_rgba(0,0,0,0.015)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      selectedVariantId === v.id
                        ? "border-[#0f5132] bg-[#0f5132]"
                        : "border-neutral-300 bg-white"
                    }`}>
                      {selectedVariantId === v.id && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold text-slate-750">{v.name}</span>
                  </div>
                  <span className="text-sm font-black text-[#0f5132]">
                    {currency} {Number(v.price).toFixed(2)}
                  </span>
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={selectedVariantId === v.id}
                    onChange={() => setSelectedVariantId(v.id)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Selection */}
        {availableAddons && availableAddons.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Add Extras</h3>
              <span className="text-[9px] text-slate-400 bg-slate-50 border border-neutral-100 px-2.5 py-0.5 rounded-full">Optional</span>
            </div>
            <div className="space-y-2">
              {availableAddons.map((addon: any) => (
                <label
                  key={addon.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                    selectedAddonIds.includes(addon.id)
                      ? "border-[#0f5132]/35 bg-[#0f5132]/5 font-bold"
                      : "border-neutral-100 bg-white hover:bg-slate-50 shadow-[0_4px_15px_rgba(0,0,0,0.015)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      selectedAddonIds.includes(addon.id)
                        ? "border-[#0f5132] bg-[#0f5132]"
                        : "border-neutral-300 bg-white"
                    }`}>
                      {selectedAddonIds.includes(addon.id) && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold text-slate-750">{addon.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    + {currency} {Number(addon.additionalPrice).toFixed(2)}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedAddonIds.includes(addon.id)}
                    onChange={() => handleAddonToggle(addon.id)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <MessageSquare className="w-4 h-4 text-[#0f5132]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Special Instructions</h3>
          </div>
          <textarea
            rows={3}
            placeholder="E.g., No onions, extra spicy, sauce on the side..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-4 text-sm rounded-2xl border border-neutral-100 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f5132]/30 focus:border-[#0f5132] transition-all resize-none shadow-[0_4px_15px_rgba(0,0,0,0.01)]"
          />
        </div>

        {/* Quantity and Add to Cart */}
        <div className="flex gap-4 items-center pt-4 border-t border-neutral-100">
          {/* Quantity selector */}
          <div className="flex items-center bg-white border border-neutral-100 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-slate-50 active:scale-90"
            >
              <Minus className="w-4 h-4 text-slate-400" />
            </button>
            <span className="w-8 text-center font-black text-sm text-slate-700">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-slate-50 active:scale-90"
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            className="flex-1 py-4 px-5 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-2xl transition-all duration-200 active:scale-[0.97] shadow-md shadow-[#0f5132]/10 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add · {currency} {livePrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
