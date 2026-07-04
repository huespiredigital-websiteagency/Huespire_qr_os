"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Search,
  Plus,
  Loader2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  UserCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export default function AdminRestaurants() {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Wizard form data
  const [wizardData, setWizardData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    subdomain: "",
    planCode: "STARTER",
  });

  // Fetch function
  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/restaurants?page=${page}&limit=10&search=${search}`);
      if (res.data?.success) {
        setItems(res.data.data.items);
        setTotalPages(res.data.data.meta.totalPages);
      }
    } catch {
      addToast("Failed to fetch restaurants list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [page, search]);

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardLoading(true);
    try {
      const res = await apiClient.post("/admin/restaurants", wizardData);
      if (res.data?.success) {
        addToast("Restaurant onboarded successfully", "success");
        setIsWizardOpen(false);
        setWizardStep(1);
        setWizardData({
          name: "",
          email: "",
          phone: "",
          address: "",
          ownerName: "",
          ownerEmail: "",
          ownerPassword: "",
          subdomain: "",
          planCode: "STARTER",
        });
        fetchRestaurants();
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Failed to onboard restaurant", "error");
    } finally {
      setWizardLoading(false);
    }
  };

  const handleImpersonate = async (id: string, subdomain: string, customDomain: string | null) => {
    try {
      const res = await apiClient.post(`/admin/restaurants/${id}/impersonate`);
      if (res.data?.success && res.data.accessToken) {
        // Save admin session first
        const adminToken = localStorage.getItem("accessToken");
        const adminUser = localStorage.getItem("user");
        if (adminToken && adminUser) {
          localStorage.setItem("adminAccessToken", adminToken);
          localStorage.setItem("adminUser", adminUser);
        }

        // Write owner session
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        addToast(`Redirecting to ${subdomain} environment...`, "success");

        // Determine destination redirect
        const host = window.location.host;
        let destHost = `${subdomain}.huespire.digital`;
        if (customDomain) {
          destHost = customDomain;
        } else if (host.includes("localhost")) {
          destHost = `${subdomain}.localhost:3000`;
        }

        window.location.href = `${window.location.protocol}//${destHost}/dashboard`;
      }
    } catch (err: any) {
      addToast(err.response?.data?.message || "Impersonation validation failed", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this restaurant and all associated tables/menu items? This action is irreversible.")) return;
    try {
      await apiClient.delete(`/admin/restaurants/${id}`);
      addToast("Restaurant deleted successfully", "success");
      fetchRestaurants();
    } catch {
      addToast("Failed to delete restaurant", "error");
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      await apiClient.patch(`/admin/restaurants/${item.id}`, {
        isActive: !item.isActive
      });
      addToast("Restaurant status updated", "success");
      fetchRestaurants();
    } catch {
      addToast("Failed to update status", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tenants & Restaurants</h1>
          <p className="text-slate-400 text-sm">Register new client restaurants, change limits, or impersonate owners.</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-3 rounded-xl flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="h-4 w-4" />
          Onboard Restaurant Wizard
        </button>
      </div>

      {/* Search Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by restaurant name, email, or subdomain..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Restaurants List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-500 uppercase font-extrabold border-b border-slate-800 tracking-wider">
                <th className="p-4">Name & Subdomain</th>
                <th className="p-4">Owner Contact</th>
                <th className="p-4">Billing Plan</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No active restaurant tenants matching search query.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-bold">{item.name}</p>
                        <p className="text-slate-500 font-mono mt-0.5">{item.subdomain}.huespire.digital</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-slate-300 flex items-center gap-1.5">
                          {item.users[0]?.firstName || "No Owner"}
                          {item.users[0] && (
                            <span className={`inline-flex px-1.5 py-0.25 text-[8px] font-extrabold uppercase rounded border ${
                              item.users[0].isEmailVerified
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}>
                              {item.users[0].isEmailVerified ? "Verified" : "Pending"}
                            </span>
                          )}
                        </p>
                        <p className="text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          {item.email}
                          {item.users[0] && !item.users[0].isEmailVerified && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiClient.post(`/admin/owners/${item.users[0].id}/resend-verification`);
                                  addToast("Verification email link resent successfully!", "success");
                                } catch {
                                  addToast("Failed to resend link.", "error");
                                }
                              }}
                              className="text-[9px] font-extrabold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                            >
                              Resend Link
                            </button>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 font-bold uppercase rounded text-[10px]">
                        {item.subscription?.plan?.name || "Free"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] cursor-pointer active:scale-95 transition ${
                          item.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {item.isActive ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleImpersonate(item.id, item.subdomain, item.domain)}
                          className="p-2 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 rounded-xl transition cursor-pointer"
                          title="Impersonate Owner Login"
                        >
                          <UserCheck className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-xl transition cursor-pointer"
                          title="Delete Tenant"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
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

      {/* 4-STEP ONBOARDING WIZARD MODAL */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 font-extrabold uppercase rounded-full text-[9px] tracking-wide">
                  <Sparkles className="h-3 w-3" />
                  Tenant Wizard
                </div>
                <h3 className="text-lg font-black text-white">Onboard Test Owner</h3>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-500 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Progress Bar */}
            <div className="bg-slate-800 h-1 flex">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${(wizardStep / 4) * 100}%` }}
              />
            </div>

            <form onSubmit={handleWizardSubmit} className="p-6 space-y-6">
              {/* STEP 1: RESTAURANT INFO */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-2">Step 1: Restaurant Information</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Restaurant Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Pizza Factory"
                      value={wizardData.name}
                      onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Public Contact Email</label>
                      <input
                        type="email"
                        required
                        placeholder="pizza@factory.com"
                        value={wizardData.email}
                        onChange={(e) => setWizardData({ ...wizardData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Phone Number</label>
                      <input
                        type="text"
                        required
                        placeholder="+919876543210"
                        value={wizardData.phone}
                        onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Street Address</label>
                    <input
                      type="text"
                      placeholder="123 Food Street, Main Layout"
                      value={wizardData.address}
                      onChange={(e) => setWizardData({ ...wizardData, address: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: OWNER INFO */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-2">Step 2: Owner Login Profile</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Sharath Kumar"
                      value={wizardData.ownerName}
                      onChange={(e) => setWizardData({ ...wizardData, ownerName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Owner Login Email</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@pizzafactory.com"
                      value={wizardData.ownerEmail}
                      onChange={(e) => setWizardData({ ...wizardData, ownerEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Secure Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={wizardData.ownerPassword}
                      onChange={(e) => setWizardData({ ...wizardData, ownerPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: SUBDOMAIN RESOLVER */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-2">Step 3: SaaS Routing Subdomain</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Desired Subdomain</label>
                    <div className="flex">
                      <input
                        type="text"
                        required
                        placeholder="pizza"
                        value={wizardData.subdomain}
                        onChange={(e) => setWizardData({ ...wizardData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                        className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 border-r-0 focus:border-indigo-500 rounded-l-xl text-sm placeholder-slate-700 text-white focus:outline-none"
                      />
                      <span className="bg-slate-950 border border-slate-800 border-l-0 px-4 py-3 rounded-r-xl text-sm text-slate-500 select-none">
                        .huespire.digital
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-relaxed mt-1">
                      This defines the unique URL for public QR menu pages (e.g. pizza.huespire.digital).
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 4: SAAS PACKAGE LIMITS */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide mb-2">Step 4: Subscription Package</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">SaaS Plan Tier</label>
                    <select
                      value={wizardData.planCode}
                      onChange={(e) => setWizardData({ ...wizardData, planCode: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-none cursor-pointer"
                    >
                      <option value="STARTER">Starter Plan (20 tables limit)</option>
                      <option value="GROWTH">Growth Plan (40 tables limit + Custom Domain)</option>
                      <option value="ENTERPRISE">Enterprise Plan (Unlimited tables/staff)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Modal Navigation Buttons */}
              <div className="flex justify-between items-center border-t border-slate-800 pt-4 bg-slate-900">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    Previous
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl transition cursor-pointer"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={wizardLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    {wizardLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Onboard Restaurant
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
