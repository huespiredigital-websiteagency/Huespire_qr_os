"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getAddons, createAddon, updateAddon, deleteAddon, getCategories, getMenuItems } from "@/lib/api/menu";
import { toast } from "react-hot-toast";

export default function AddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    additionalPrice: number;
    isActive: boolean;
    categoryIds: string[];
    menuItemIds: string[];
  }>({
    name: "",
    description: "",
    additionalPrice: 0,
    isActive: true,
    categoryIds: [],
    menuItemIds: []
  });

  // Search & Filter state for modal assignment lists
  const [categorySearch, setCategorySearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [addonsRes, catRes, itemsRes] = await Promise.all([
        getAddons(),
        getCategories(),
        getMenuItems()
      ]);
      setAddons(addonsRes.data || []);
      setCategories(catRes.data || []);
      setMenuItems(itemsRes.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAddon) {
        await updateAddon(editingAddon.id, formData);
        toast.success("Add-on updated successfully");
      } else {
        await createAddon(formData);
        toast.success("Add-on created successfully");
      }
      setIsModalOpen(false);
      fetchInitialData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save add-on");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this add-on?")) {
      try {
        await deleteAddon(id);
        toast.success("Add-on deleted");
        fetchInitialData();
      } catch (err: any) {
        toast.error("Failed to delete add-on");
      }
    }
  };

  const openModal = (addon: any = null) => {
    setEditingAddon(addon);
    setCategorySearch("");
    setItemSearch("");
    if (addon) {
      const assignedCatIds = addon.categoryAddons ? addon.categoryAddons.map((ca: any) => ca.categoryId) : [];
      const assignedItemIds = addon.menuItemAddons ? addon.menuItemAddons.map((ma: any) => ma.menuItemId) : [];
      setFormData({
        name: addon.name,
        description: addon.description || "",
        additionalPrice: Number(addon.additionalPrice),
        isActive: addon.isActive,
        categoryIds: assignedCatIds,
        menuItemIds: assignedItemIds
      });
    } else {
      setFormData({
        name: "",
        description: "",
        additionalPrice: 0,
        isActive: true,
        categoryIds: [],
        menuItemIds: []
      });
    }
    setIsModalOpen(true);
  };

  // Filtered lists for modal assignment
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categories, categorySearch]);

  const filteredMenuItems = useMemo(() => {
    if (!itemSearch.trim()) return menuItems;
    return menuItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [menuItems, itemSearch]);

  // Checkbox toggle handlers
  const toggleCategory = (catId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(catId)
        ? prev.categoryIds.filter(id => id !== catId)
        : [...prev.categoryIds, catId]
    }));
  };

  const toggleMenuItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      menuItemIds: prev.menuItemIds.includes(itemId)
        ? prev.menuItemIds.filter(id => id !== itemId)
        : [...prev.menuItemIds, itemId]
    }));
  };

  const selectAllFilteredItems = () => {
    const filteredIds = filteredMenuItems.map(i => i.id);
    setFormData(prev => ({
      ...prev,
      menuItemIds: Array.from(new Set([...prev.menuItemIds, ...filteredIds]))
    }));
  };

  const clearAllItems = () => {
    setFormData(prev => ({ ...prev, menuItemIds: [] }));
  };

  if (loading) return <div className="p-8 text-neutral-400">Loading add-ons and assignments...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Menu Add-ons</h1>
          <p className="text-neutral-400">Manage extras and selectively assign them to categories or individual menu items.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-900/20"
        >
          + Create Add-on
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800">
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Add-on Name</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider hidden md:table-cell">Description</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Price</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Assignments</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addons.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-neutral-500">
                  No add-ons created yet.
                </td>
              </tr>
            ) : (
              addons.map((addon) => {
                const catCount = addon.categoryAddons ? addon.categoryAddons.length : 0;
                const itemCount = addon.menuItemAddons ? addon.menuItemAddons.length : 0;
                return (
                  <tr key={addon.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group">
                    <td className="p-5 font-bold text-white">{addon.name}</td>
                    <td className="p-5 text-neutral-400 text-sm hidden md:table-cell">{addon.description || "-"}</td>
                    <td className="p-5 text-emerald-400 font-bold">+${Number(addon.additionalPrice).toFixed(2)}</td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {catCount} Categories
                        </span>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {itemCount} Items
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${addon.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                        {addon.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(addon)} className="text-neutral-400 hover:text-white transition-colors font-semibold text-sm">Edit</button>
                        <button onClick={() => handleDelete(addon.id)} className="text-red-500/70 hover:text-red-500 transition-colors font-semibold text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl relative max-h-[90vh] flex flex-col my-auto">
            <h2 className="text-2xl font-bold text-white mb-4">
              {editingAddon ? "Edit Add-on" : "New Add-on"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto pr-2">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Add-on Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                    placeholder="e.g. Extra Cheese"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Additional Price ($)</label>
                  <input 
                    type="number" step="0.01" min="0"
                    value={formData.additionalPrice}
                    onChange={(e) => setFormData({...formData, additionalPrice: parseFloat(e.target.value) || 0})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Description (Optional)</label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm"
                  placeholder="e.g. Fresh melted mozzarella slice"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4.5 h-4.5 rounded bg-neutral-950 border-neutral-800 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-neutral-300 cursor-pointer">Add-on is active and available for ordering</label>
              </div>

              <hr className="border-neutral-800" />

              {/* Assignment Sections */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-1">1. Apply To Categories</h3>
                  <p className="text-xs text-neutral-400 mb-3">Select categories to automatically apply this add-on to all current and future items within them.</p>
                  
                  <input 
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mb-3"
                  />

                  <div className="max-h-36 overflow-y-auto border border-neutral-800 rounded-2xl p-3 bg-neutral-950/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredCategories.length === 0 ? (
                      <span className="text-xs text-neutral-500 col-span-2 py-2 text-center">No matching categories found.</span>
                    ) : (
                      filteredCategories.map(cat => (
                        <label key={cat.id} className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-neutral-850 cursor-pointer transition-colors border border-transparent hover:border-neutral-800">
                          <input 
                            type="checkbox"
                            checked={formData.categoryIds.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-xs font-medium text-white">{cat.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-1 text-right">
                    <span className="text-[11px] text-indigo-400 font-semibold">{formData.categoryIds.length} categories selected</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">2. Apply To Individual Menu Items</h3>
                    <div className="space-x-3 text-xs">
                      <button type="button" onClick={selectAllFilteredItems} className="text-amber-400 hover:underline font-semibold">Select All Filtered</button>
                      <button type="button" onClick={clearAllItems} className="text-neutral-500 hover:text-neutral-300 font-semibold">Clear Selection</button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 mb-3">Select specific individual items to assign this add-on to.</p>

                  <input 
                    type="text"
                    placeholder="Search menu items..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mb-3"
                  />

                  <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded-2xl p-3 bg-neutral-950/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredMenuItems.length === 0 ? (
                      <span className="text-xs text-neutral-500 col-span-2 py-2 text-center">No matching menu items found.</span>
                    ) : (
                      filteredMenuItems.map(item => (
                        <label key={item.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-850 cursor-pointer transition-colors border border-transparent hover:border-neutral-800">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input 
                              type="checkbox"
                              checked={formData.menuItemIds.includes(item.id)}
                              onChange={() => toggleMenuItem(item.id)}
                              className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                            />
                            <span className="text-xs font-medium text-white truncate">{item.name}</span>
                          </div>
                          {item.category?.name && (
                            <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                              {item.category.name}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                  <div className="mt-1 text-right">
                    <span className="text-[11px] text-amber-400 font-semibold">{formData.menuItemIds.length} items selected</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-neutral-800 sticky bottom-0 bg-neutral-900 py-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-transparent border border-neutral-700 hover:bg-neutral-800 text-white rounded-xl transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition-colors font-bold text-sm shadow-lg shadow-amber-900/20"
                >
                  {editingAddon ? "Save Changes" : "Create Add-on"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
