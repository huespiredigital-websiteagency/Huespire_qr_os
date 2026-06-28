"use client";

import React, { useEffect, useState } from "react";
import { getVariants, getMenuItems, createVariant, updateVariant, deleteVariant } from "@/lib/api/menu";
import { toast } from "react-hot-toast";

export default function VariantsPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>("");
  
  const [formData, setFormData] = useState({ 
    menuItemId: "",
    name: "", 
    price: 0, 
    preparationTime: 15,
    isAvailable: true 
  });

  useEffect(() => {
    fetchData();
  }, [selectedMenuItem]);

  const fetchData = async () => {
    try {
      const [variantsRes, itemsRes] = await Promise.all([
        getVariants(selectedMenuItem || undefined),
        getMenuItems()
      ]);
      setVariants(variantsRes.data);
      if (!selectedMenuItem) setMenuItems(itemsRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVariant) {
        await updateVariant(editingVariant.id, formData);
        toast.success("Variant updated successfully");
      } else {
        await createVariant(formData);
        toast.success("Variant created successfully");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save variant");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this variant?")) {
      try {
        await deleteVariant(id);
        toast.success("Variant deleted");
        fetchData();
      } catch (err: any) {
        toast.error("Failed to delete variant");
      }
    }
  };

  const openModal = (variant: any = null) => {
    setEditingVariant(variant);
    if (variant) {
      setFormData({ 
        menuItemId: variant.menuItemId,
        name: variant.name, 
        price: Number(variant.price),
        preparationTime: Number(variant.preparationTime),
        isAvailable: variant.isAvailable 
      });
    } else {
      setFormData({ 
        menuItemId: selectedMenuItem || (menuItems[0]?.id || ""),
        name: "", 
        price: 0, 
        preparationTime: 15,
        isAvailable: true 
      });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-neutral-400">Loading variants...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Item Variants</h1>
          <p className="text-neutral-400">Manage sizes, portions, or options for specific items.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select
            value={selectedMenuItem}
            onChange={(e) => setSelectedMenuItem(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 transition-colors w-full md:w-48"
          >
            <option value="">All Menu Items</option>
            {menuItems.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button 
            onClick={() => openModal()}
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-amber-900/20 whitespace-nowrap"
          >
            + Add Variant
          </button>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800">
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Name</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Menu Item</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Price Override</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-neutral-500">
                  No variants found. Click "+ Add Variant" to create one.
                </td>
              </tr>
            ) : (
              variants.map((variant) => (
                <tr key={variant.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group">
                  <td className="p-5 font-medium text-white">{variant.name}</td>
                  <td className="p-5 text-neutral-400 text-sm">{variant.menuItem?.name || "Unknown"}</td>
                  <td className="p-5 text-amber-500 font-bold">${Number(variant.price).toFixed(2)}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${variant.isAvailable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                      {variant.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(variant)} className="text-neutral-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(variant.id)} className="text-red-500/70 hover:text-red-500 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingVariant ? "Edit Variant" : "New Variant"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Parent Menu Item</label>
                <select 
                  value={formData.menuItemId}
                  onChange={(e) => setFormData({...formData, menuItemId: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                >
                  <option value="" disabled>Select Menu Item</option>
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Variant Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="e.g. Large, 12-inch, Spicy"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Price Override ($)</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                  className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-amber-500 focus:ring-amber-500/20"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-neutral-300">Variant is currently available</label>
              </div>
              
              <div className="flex gap-3 pt-6 mt-4 border-t border-neutral-800/50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-transparent border border-neutral-700 hover:bg-neutral-800 text-white rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition-colors font-bold shadow-lg shadow-amber-900/20"
                >
                  {editingVariant ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
