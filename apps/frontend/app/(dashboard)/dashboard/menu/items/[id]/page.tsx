"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCategories, createMenuItem, updateMenuItem, uploadMenuImage, deleteMenuImage } from "@/lib/api/menu";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

export default function MenuItemFormPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const isNew = id === "new";
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    price: 0,
    sku: "",
    preparationTime: 15,
    calories: 0,
    isVeg: false,
    isVegan: false,
    isSpicy: false,
    isAvailable: true,
  });

  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const catsRes = await getCategories();
      setCategories(catsRes.data);
      if (catsRes.data.length > 0 && isNew) {
        setFormData(f => ({ ...f, categoryId: catsRes.data[0].id }));
      }

      if (!isNew) {
        // Fetch item details directly
        const res = await apiClient.get(`/menu-items/${id}`);
        const item = res.data.data;
        setFormData({
          name: item.name,
          description: item.description || "",
          categoryId: item.categoryId,
          price: Number(item.price),
          sku: item.sku || "",
          preparationTime: Number(item.preparationTime) || 15,
          calories: Number(item.calories) || 0,
          isVeg: item.isVeg,
          isVegan: item.isVegan,
          isSpicy: item.isSpicy,
          isAvailable: item.isAvailable,
        });
        setImages(item.images || []);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load data");
      if (!isNew) router.push("/dashboard/menu/items");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === "number") {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate
      if (!formData.categoryId) {
        toast.error("Please select a category");
        setSaving(false);
        return;
      }
      
      const payload = {
        ...formData,
        sku: formData.sku || undefined,
        calories: formData.calories || undefined
      };

      if (isNew) {
        await createMenuItem(payload);
        toast.success("Menu item created");
        router.push("/dashboard/menu/items");
      } else {
        await updateMenuItem(id, payload);
        toast.success("Menu item updated");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isNew) {
      toast.error("Please save the menu item first before uploading images");
      return;
    }

    const file = e.target.files[0];
    try {
      const res = await uploadMenuImage(id, file, true);
      setImages([res.data]);
      toast.success("Image updated successfully", { id: "upload" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload image", { id: "upload" });
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    try {
      await deleteMenuImage(imageId);
      setImages(images.filter(img => img.id !== imageId));
      toast.success("Image removed");
    } catch (err: any) {
      toast.error("Failed to remove image");
    }
  };

  if (loading) return <div className="p-8 text-neutral-400">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/menu/items" className="text-neutral-400 hover:text-white transition-colors">
          ← Back
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">{isNew ? "Create Menu Item" : "Edit Menu Item"}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange} required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors"
                  placeholder="e.g. Classic Burger"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <textarea 
                  name="description" value={formData.description} onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors h-24 resize-none"
                  placeholder="Detailed description of the dish..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Category</label>
                <select 
                  name="categoryId" value={formData.categoryId} onChange={handleChange} required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Price ($)</label>
                <input 
                  type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleChange} required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">SKU (Optional)</label>
                <input 
                  type="text" name="sku" value={formData.sku} onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Prep Time (mins)</label>
                <input 
                  type="number" min="0" name="preparationTime" value={formData.preparationTime} onChange={handleChange}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <hr className="border-neutral-800" />
            
            <h2 className="text-xl font-bold text-white mb-4">Dietary & Status</h2>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isVeg" checked={formData.isVeg} onChange={handleChange} className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-green-500" />
                <span className="text-sm font-medium text-neutral-300">Vegetarian</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isVegan" checked={formData.isVegan} onChange={handleChange} className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-emerald-500" />
                <span className="text-sm font-medium text-neutral-300">Vegan</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isSpicy" checked={formData.isSpicy} onChange={handleChange} className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-red-500" />
                <span className="text-sm font-medium text-neutral-300">Spicy</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer ml-auto">
                <input type="checkbox" name="isAvailable" checked={formData.isAvailable} onChange={handleChange} className="w-5 h-5 rounded bg-neutral-950 border-neutral-800 text-amber-500" />
                <span className="text-sm font-bold text-white">Available</span>
              </label>
            </div>

            <div className="pt-6 border-t border-neutral-800">
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50"
              >
                {saving ? "Saving..." : isNew ? "Create Menu Item" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Sidebar for Images */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Images</h2>
            {isNew ? (
              <p className="text-neutral-500 text-sm bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                Please save the item first to upload images.
              </p>
            ) : (
              <div className="space-y-4">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                    <img src={img.imageUrl} alt={img.imageName} className="w-full h-40 object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleRemoveImage(img.id)}
                        className="bg-red-500/90 text-white p-2 rounded-lg hover:bg-red-500 transition-colors shadow-lg"
                        title="Delete Image"
                      >
                        🗑️
                      </button>
                    </div>
                    {img.isPrimary && (
                      <span className="absolute bottom-2 left-2 bg-amber-500 text-neutral-950 text-xs font-bold px-2 py-1 rounded shadow-md">
                        PRIMARY
                      </span>
                    )}
                  </div>
                ))}
                
                <label className="block w-full cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-xl p-8 text-center transition-colors">
                    <span className="text-2xl mb-2 block">📸</span>
                    <span className="text-neutral-400 text-sm font-medium">
                      {images.length > 0 ? "Click to replace image" : "Click to upload image"}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
