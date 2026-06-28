"use client";

import React, { useEffect, useState } from "react";
import { getMenuItems, getCategories, deleteMenuItem } from "@/lib/api/menu";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";

export default function MenuItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        getMenuItems(selectedCategory || undefined),
        getCategories()
      ]);
      setItems(itemsRes.data);
      if (!selectedCategory) setCategories(catsRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      try {
        await deleteMenuItem(id);
        toast.success("Menu item deleted");
        fetchData();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to delete item");
      }
    }
  };

  if (loading && items.length === 0) return <div className="p-8 text-neutral-400">Loading menu items...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Menu Items</h1>
          <p className="text-neutral-400">Manage all your dishes and products.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors w-full md:w-48"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Link href="/dashboard/menu/items/new" className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-amber-900/20 whitespace-nowrap">
            + Add Item
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-12 text-center">
          <div className="text-5xl mb-4">🍔</div>
          <h3 className="text-xl font-bold text-white mb-2">No Menu Items Found</h3>
          <p className="text-neutral-500 mb-6 max-w-sm mx-auto">Start adding dishes to your menu. Make sure you have at least one category first.</p>
          <Link 
            href="/dashboard/menu/items/new"
            className="text-amber-500 hover:text-amber-400 font-medium"
          >
            Create your first item →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const primaryImage = item.images?.find((img: any) => img.isPrimary) || item.images?.[0];
            return (
              <div key={item.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl overflow-hidden transition-all group flex flex-col">
                <div className="relative h-48 bg-neutral-950 w-full flex items-center justify-center">
                  {primaryImage ? (
                    <img 
                      src={primaryImage.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="text-4xl opacity-50">🍽️</span>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {item.isVeg && <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-1 rounded backdrop-blur-md border border-green-500/30">VEG</span>}
                    {item.isVegan && <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded backdrop-blur-md border border-emerald-500/30">VEGAN</span>}
                    {item.isSpicy && <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded backdrop-blur-md border border-red-500/30">SPICY</span>}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-80" />
                </div>
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <span className="text-amber-500 font-bold">${Number(item.price).toFixed(2)}</span>
                  </div>
                  
                  <p className="text-xs font-medium text-amber-500/60 uppercase tracking-wider mb-3">
                    {item.category?.name || "Uncategorized"}
                  </p>
                  
                  <p className="text-neutral-400 text-sm mb-6 line-clamp-2 flex-1">
                    {item.description || "No description."}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-neutral-800 pt-4 mt-auto">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-emerald-500' : 'bg-neutral-700'}`}></span>
                      <span className="text-xs text-neutral-500">{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/menu/items/${item.id}`} className="text-neutral-400 hover:text-white transition-colors text-sm font-medium">Edit</Link>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500/70 hover:text-red-500 transition-colors text-sm font-medium">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
