"use client";

import React, { useEffect, useState } from "react";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api/menu";
import { toast } from "react-hot-toast";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", isActive: true });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast.success("Category updated successfully");
      } else {
        await createCategory(formData);
        toast.success("Category created successfully");
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteCategory(id);
        toast.success("Category deleted");
        fetchCategories();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to delete category");
      }
    }
  };

  const openModal = (category: any = null) => {
    setEditingCategory(category);
    if (category) {
      setFormData({ name: category.name, description: category.description || "", isActive: category.isActive });
    } else {
      setFormData({ name: "", description: "", isActive: true });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-neutral-400">Loading categories...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Menu Categories</h1>
          <p className="text-neutral-400">Organize your menu into beautiful sections.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-6 py-2 rounded-xl transition-all shadow-lg shadow-amber-900/20"
        >
          + Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-12 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-white mb-2">No Categories Yet</h3>
          <p className="text-neutral-500 mb-6 max-w-sm mx-auto">Create your first category like "Starters" or "Main Course" to start building your menu.</p>
          <button 
            onClick={() => openModal()}
            className="text-amber-500 hover:text-amber-400 font-medium"
          >
            Create Category →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{cat.name}</h3>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(cat)} className="text-neutral-400 hover:text-white transition-colors">Edit</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500/70 hover:text-red-500 transition-colors">Delete</button>
                </div>
              </div>
              <p className="text-neutral-500 text-sm mb-6 line-clamp-2">{cat.description || "No description provided."}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                  {cat._count?.menuItems || 0} Items
                </span>
                <span className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-neutral-700'}`}></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCategory ? "Edit Category" : "New Category"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="e.g. Desserts"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none h-24"
                  placeholder="Sweet treats to end your meal"
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
                <label htmlFor="isActive" className="text-sm font-medium text-neutral-300">Category is active and visible</label>
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
                  {editingCategory ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
