"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  CreditCard,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export default function AdminSubscriptions() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit subscription modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [editData, setEditData] = useState({
    planCode: "STARTER",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    nextBillingDate: "",
  });

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/subscriptions?page=${page}&limit=10`);
      if (res.data?.success) {
        setItems(res.data.data.items);
        setTotalPages(res.data.data.meta.totalPages);
      }
    } catch {
      addToast("Failed to fetch subscriptions list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page]);

  const handleEditClick = (sub: any) => {
    setSelectedSub(sub);
    setEditData({
      planCode: sub.plan?.code || "STARTER",
      status: sub.status,
      billingCycle: sub.billingCycle,
      nextBillingDate: sub.nextBillingDate ? new Date(sub.nextBillingDate).toISOString().split("T")[0] : "",
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await apiClient.patch(`/admin/subscriptions/${selectedSub.restaurantId}`, editData);
      if (res.data?.success) {
        addToast("Subscription updated successfully", "success");
        setIsEditOpen(false);
        fetchSubscriptions();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to update subscription", "error");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Billing & Subscriptions</h1>
        <p className="text-slate-400 text-sm">Manage billing cycles, upgrade/downgrade tiers, or override trial dates.</p>
      </div>

      {/* Subscriptions List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-500 uppercase font-extrabold border-b border-slate-800 tracking-wider">
                <th className="p-4">Restaurant</th>
                <th className="p-4">Active Plan</th>
                <th className="p-4">Monthly Rate</th>
                <th className="p-4">Cycle</th>
                <th className="p-4">Status</th>
                <th className="p-4">Renewal Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No active subscriptions found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-bold">{item.restaurant?.name}</p>
                        <p className="text-slate-500 font-mono mt-0.5">{item.restaurant?.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold uppercase rounded text-[10px]">
                        {item.plan?.name}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      ₹{Number(item.monthlyPrice).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400 uppercase">
                      {item.billingCycle}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        item.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.status === "TRIAL"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {new Date(item.nextBillingDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer active:scale-95 border border-slate-700/50"
                      >
                        Adjust Limits
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-50 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADJUST SUBSCRIPTION MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 font-extrabold uppercase rounded-full text-[9px] tracking-wide">
                  <CreditCard className="h-3 w-3" />
                  SaaS Limits
                </div>
                <h3 className="text-lg font-black text-white">Adjust Subscription</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-500 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Upgrade/Downgrade Plan</label>
                <select
                  value={editData.planCode}
                  onChange={(e) => setEditData({ ...editData, planCode: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="STARTER">Starter Plan (20 tables limit)</option>
                  <option value="GROWTH">Growth Plan (40 tables limit)</option>
                  <option value="ENTERPRISE">Enterprise Plan (Unlimited)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="TRIAL">Trial</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Billing Cycle</label>
                  <select
                    value={editData.billingCycle}
                    onChange={(e) => setEditData({ ...editData, billingCycle: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase">Renewal / Expiry Date</label>
                <input
                  type="date"
                  required
                  value={editData.nextBillingDate}
                  onChange={(e) => setEditData({ ...editData, nextBillingDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 bg-slate-900 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
