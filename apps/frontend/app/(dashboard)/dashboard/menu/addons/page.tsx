"use client";

import React, { useEffect, useState } from "react";
import { getAddons, createAddon, updateAddon, deleteAddon } from "@/lib/api/menu";
import { toast } from "react-hot-toast";

export default function AddonsPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", additionalPrice: 0, isActive: true });

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      const res = await getAddons();
      setAddons(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load addons");
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
      fetchAddons();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save add-on");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this add-on?")) {
      try {
        await deleteAddon(id);
        toast.success("Add-on deleted");
        fetchAddons();
      } catch (err: any) {
        toast.error("Failed to delete add-on");
      }
    }
  };

  const openModal = (addon: any = null) => {
    setEditingAddon(addon);
    if (addon) {
      setFormData({ name: addon.name, description: addon.description || "", additionalPrice: Number(addon.additionalPrice), isActive: addon.isActive });
    } else {
      setFormData({ name: "", description: "", additionalPrice: 0, isActive: true });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-neutral-400">Loading add-ons...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Global Add-ons</h1>
          <p className="text-neutral-400">Manage extra options like toppings and add-ons.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-amber-900/20"
        >
          + Create Add-on
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800">
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Name</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider hidden md:table-cell">Description</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Additional Price</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider">Status</th>
              <th className="p-5 text-sm font-bold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {addons.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-neutral-500">
                  No add-ons created yet.
                </td>
              </tr>
            ) : (
              addons.map((addon) => (
                <tr key={addon.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group">
                  <td className="p-5 font-medium text-white">{addon.name}</td>
                  <td className="p-5 text-neutral-400 text-sm hidden md:table-cell">{addon.description || "-"}</td>
                  <td className="p-5 text-emerald-400 font-bold">+${Number(addon.additionalPrice).toFixed(2)}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${addon.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                      {addon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(addon)} className="text-neutral-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(addon.id)} className="text-red-500/70 hover:text-red-500 transition-colors">Delete</button>
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
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingAddon ? "Edit Add-on" : "New Add-on"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="e.g. Extra Cheese"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none h-20"
                  placeholder="Extra slice of mozzarella"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Additional Price ($)</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={formData.additionalPrice}
                  onChange={(e) => setFormData({...formData, additionalPrice: parseFloat(e.target.value) || 0})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-amber-500 focus:ring-amber-500/20"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-300">Add-on is active</label>
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
                  {editingAddon ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
