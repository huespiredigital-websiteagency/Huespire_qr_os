"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Users,
  Search,
  Download,
  Mail,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  User,
  History,
  FileText,
  Calendar,
} from "lucide-react";

export default function CustomersCRMPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState<boolean | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState("");

  // Drawer / Selection Detail State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit State inside Drawer
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [vipStatus, setVipStatus] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const vipQuery = vipOnly === true ? "&vipStatus=true" : vipOnly === false ? "&vipStatus=false" : "";
      const tagQuery = tagFilter ? `&tag=${tagFilter}` : "";
      const searchQuery = search ? `&search=${search}` : "";

      const response = await apiClient.get(`/customers?limit=50${searchQuery}${vipQuery}${tagQuery}`);
      if (response.data?.success && response.data.data) {
        setCustomers(response.data.data.customers);
        setTotalCount(response.data.data.totalCount);
      }
    } catch (err) {
      console.error("Failed to load customer CRM:", err);
      addToast("Failed to load customer registry.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [vipOnly, tagFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleSelectCustomer = async (id: string) => {
    try {
      setSelectedCustomerId(id);
      setDetailLoading(true);
      const response = await apiClient.get(`/customers/${id}`);
      if (response.data?.success && response.data.data) {
        const c = response.data.data;
        setCustomerDetail(c);
        setNotes(c.notes || "");
        setTags(c.tags || "");
        setVipStatus(c.vipStatus || false);
      }
    } catch (err) {
      console.error("Failed to fetch customer profile:", err);
      addToast("Failed to load customer details.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomerId) return;
    try {
      setUpdatingProfile(true);
      const response = await apiClient.patch(`/customers/${selectedCustomerId}`, {
        notes,
        tags,
        vipStatus,
      });

      if (response.data?.success) {
        addToast("Customer CRM profile updated successfully!", "success");
        // Reload list and drawer details
        fetchCustomers();
        handleSelectCustomer(selectedCustomerId);
      }
    } catch (err) {
      console.error("Failed to save CRM updates:", err);
      addToast("Failed to save CRM updates.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get(`/customers/export/csv?search=${search}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "customers-crm.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("CRM exported to CSV successfully!", "success");
    } catch (err) {
      console.error("Failed to export CSV:", err);
      addToast("Failed to export CRM.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            Customer CRM Registry
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Track user lifetime values, visit history, loyalty points, and send email campaigns.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportCsv} className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 text-xs font-extrabold rounded-xl cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            Export CRM CSV
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-850 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, phone number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 pl-10 pr-4 py-3 rounded-2xl text-xs placeholder-slate-600 text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 rounded-2xl text-xs font-extrabold cursor-pointer">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={vipOnly === undefined ? "all" : vipOnly ? "vip" : "standard"}
            onChange={(e) => {
              const val = e.target.value;
              setVipOnly(val === "all" ? undefined : val === "vip");
            }}
            className="bg-slate-950 border border-slate-850 text-xs text-slate-300 px-3 py-3 rounded-2xl focus:outline-none cursor-pointer"
          >
            <option value="all">All VIP Statuses</option>
            <option value="vip">VIP Customers Only</option>
            <option value="standard">Standard Only</option>
          </select>

          <input
            type="text"
            placeholder="Filter by Tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="bg-slate-950 border border-slate-850 text-xs text-white px-3 py-3 rounded-2xl placeholder-slate-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid: List & Drawer Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List table */}
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-slate-850 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-300">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Customer Details</th>
                  <th className="py-4 px-6 text-right">Orders</th>
                  <th className="py-4 px-6 text-right">Lifetime Spend</th>
                  <th className="py-4 px-6 text-right">Loyalty Points</th>
                  <th className="py-4 px-6">Tags</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-5 px-6"><div className="h-4 bg-slate-800 rounded w-3/4" /></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-800 rounded w-1/4 ml-auto" /></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-800 rounded w-1/3 ml-auto" /></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-800 rounded w-1/4 ml-auto" /></td>
                      <td className="py-5 px-6"><div className="h-4 bg-slate-800 rounded w-1/2" /></td>
                      <td className="py-5 px-6"></td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-semibold">
                      No customer profiles matched your query parameters.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className={`hover:bg-slate-850/30 transition cursor-pointer ${
                        selectedCustomerId === c.id ? "bg-indigo-600/5 border-l-2 border-l-indigo-500" : ""
                      }`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl border flex items-center justify-center ${
                            c.vipStatus
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-slate-950 border-slate-850 text-slate-400"
                          }`}>
                            {c.vipStatus ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm">{c.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{c.phone} | {c.email || "No Email"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-slate-200">{c.totalOrders}</td>
                      <td className="py-4 px-6 text-right font-extrabold text-white">₹{Number(c.totalSpent).toFixed(2)}</td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 font-extrabold text-[10px] border border-indigo-500/20">
                          {c.loyaltyPoints} pts
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {c.tags
                            ? c.tags.split(",").map((t: string) => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-[10px] text-slate-400">
                                  {t.trim()}
                                </span>
                              ))
                            : "-"}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <ChevronRight className="h-4 w-4 text-slate-600 inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Drawer panel (Right side) */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-850 rounded-3xl p-6 shadow-2xl h-fit space-y-6">
          {!selectedCustomerId ? (
            <div className="text-center py-16 space-y-3">
              <Users className="h-10 w-10 text-slate-700 mx-auto" />
              <h3 className="font-bold text-slate-400 text-sm">Select a Customer Profile</h3>
              <p className="text-slate-600 text-xs px-4">
                Click on any customer entry in the table to display metrics, notes, visit history, and logs.
              </p>
            </div>
          ) : detailLoading || !customerDetail ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-slate-800 rounded-2xl w-3/4" />
              <div className="h-24 bg-slate-800 rounded-2xl" />
              <div className="h-32 bg-slate-800 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header profile details */}
              <div className="flex items-start justify-between border-b border-slate-850 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">{customerDetail.name}</h2>
                  <div className="text-xs text-slate-400 mt-1">{customerDetail.phone}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{customerDetail.email || "No Email Address"}</div>
                </div>
                <button
                  onClick={() => setVipStatus(!vipStatus)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase transition tracking-wider flex items-center gap-1 cursor-pointer ${
                    vipStatus
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  VIP Status
                </button>
              </div>

              {/* CRM Key Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Average Order</div>
                  <div className="text-lg font-black text-white mt-1">₹{customerDetail.averageOrderValue}</div>
                </div>
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Loyalty Points</div>
                  <div className="text-lg font-black text-indigo-400 mt-1">{customerDetail.loyaltyPoints}</div>
                </div>
                <div className="bg-slate-950 p-4 border border-slate-850 rounded-2xl col-span-2">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Last Visit Date
                  </div>
                  <div className="text-sm font-bold text-white mt-1.5">
                    {customerDetail.lastVisitAt ? new Date(customerDetail.lastVisitAt).toLocaleString() : "First time visiting"}
                  </div>
                </div>
              </div>

              {/* Edit Notes & Tags */}
              <div className="space-y-4 border-t border-slate-850 pt-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                  CRM Properties
                </h3>
                <div className="space-y-3">
                  <Input
                    label="Customer tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Regular, Veg, High-Spender"
                  />
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">Staff Notes & Preferences</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add food allergies or seating preferences..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs placeholder-slate-700 text-white focus:outline-none focus:border-indigo-500 transition resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleUpdateCustomer}
                    loading={updatingProfile}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/15"
                  >
                    Save Profile Settings
                  </Button>
                </div>
              </div>

              {/* History Tabs / Timeline */}
              <div className="space-y-4 border-t border-slate-850 pt-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  Activity History
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {customerDetail.orders?.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-600">No orders logged.</div>
                  ) : (
                    customerDetail.orders.map((o: any) => (
                      <div key={o.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex items-start justify-between text-xs">
                        <div>
                          <div className="font-extrabold text-slate-200">Order: {o.orderNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-1">Table: {o.table?.tableName || "N/A"}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-white">₹{Number(o.totalAmount).toFixed(2)}</div>
                          <span className="inline-flex px-1.5 py-0.25 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold mt-1.5">
                            {o.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
