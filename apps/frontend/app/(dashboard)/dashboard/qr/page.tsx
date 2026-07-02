"use client";

import React, { useEffect, useState } from "react";
import { apiClient, API_URL } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { Select } from "../../../../components/ui/select";
import {
  QrCode as QrIcon,
  Search,
  Filter,
  RefreshCw,
  Download,
  Printer,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle,
  XCircle,
  Layers,
  Ban,
  FileText,
} from "lucide-react";

export default function QRCodesPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const role = user?.role || "STAFF";
  const canManage = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(role);
  const canView = ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"].includes(role);

  const [loading, setLoading] = useState(true);
  const [qrs, setQrs] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals Control
  const [isRegenOpen, setIsRegenOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkRegenOpen, setIsBulkRegenOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedQr, setSelectedQr] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Print Mode State (to print a subset)
  const [printItems, setPrintItems] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qrRes, restRes] = await Promise.all([
        apiClient.get("/qr"),
        apiClient.get("/restaurants/me"),
      ]);

      if (qrRes.data?.success) setQrs(qrRes.data.data);
      if (restRes.data?.success) setRestaurant(restRes.data.data);
    } catch (err: any) {
      console.error("Failed to load QR code data:", err);
      addToast(err.response?.data?.message || "Failed to retrieve QR code profiles.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [canView, addToast]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <Ban className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-slate-900">Access Denied</h3>
          <p className="text-sm text-slate-500">
            You do not have credentials to access QR Management. Waiters and Kitchen staff do not have authorization.
          </p>
        </div>
      </div>
    );
  }

  // Statistics calculation
  const totalQrs = qrs.length;
  const activeQrs = qrs.filter((q) => q.isActive).length;
  const totalScans = qrs.reduce((acc, curr) => acc + (curr.scanCount || 0), 0);
  const mostScanned = [...qrs].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))[0];

  const filteredQrs = qrs.filter((qr) => {
    const tableNumStr = qr.table?.tableNumber?.toString() || "";
    const tableNameStr = qr.table?.tableName?.toLowerCase() || "";
    const matchesSearch =
      tableNameStr.includes(searchTerm.toLowerCase()) ||
      tableNumStr.includes(searchTerm) ||
      qr.qrToken.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && qr.isActive) ||
      (statusFilter === "inactive" && !qr.isActive);
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredQrs.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredQrs.slice(indexOfFirstItem, indexOfLastItem);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map((q) => q.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const downloadSingleQR = async (qr: any, format: "png" | "svg") => {
    try {
      const backendUrl = API_URL;
      const response = await fetch(`${backendUrl}/qr/image/${qr.qrToken}?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${qr.table?.tableName.replace(/\s+/g, "_") || qr.qrToken}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast(`QR Code (${format.toUpperCase()}) downloaded successfully.`, "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to download QR code image.", "error");
    }
  };

  // Multiple download sequentially
  const handleBulkDownload = async (format: "png" | "svg") => {
    if (selectedIds.length === 0) return;
    addToast(`Starting batch download of ${selectedIds.length} QR codes...`, "info");
    
    const selectedQrs = qrs.filter((q) => selectedIds.includes(q.id));
    for (const qr of selectedQrs) {
      await downloadSingleQR(qr, format);
      // Small pause to prevent browser blocking multiple downloads
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  // Browser Print trigger
  const triggerPrint = (items: any[]) => {
    setPrintItems(items);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Single QR actions
  const handleOpenRegen = (qr: any) => {
    setSelectedQr(qr);
    setIsRegenOpen(true);
  };

  const handleOpenDelete = (qr: any) => {
    setSelectedQr(qr);
    setIsDeleteOpen(true);
  };

  const handleRegenerate = async () => {
    if (!selectedQr) return;
    try {
      setSaving(true);
      const response = await apiClient.post("/qr/regenerate", {
        tableId: selectedQr.tableId,
      });
      if (response.data?.success) {
        addToast(`QR Code regenerated successfully. Previous code is now invalid.`, "success");
        setIsRegenOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to regenerate QR code token.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQr) return;
    try {
      setSaving(true);
      const response = await apiClient.delete(`/qr/${selectedQr.id}`);
      if (response.data?.success) {
        addToast("QR Code profile deleted/deactivated successfully.", "success");
        setIsDeleteOpen(false);
        setSelectedIds((prev) => prev.filter((id) => id !== selectedQr.id));
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to delete QR code.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Bulk actions
  const handleBulkRegenerate = async () => {
    try {
      setSaving(true);
      const selectedQrs = qrs.filter((q) => selectedIds.includes(q.id));
      let successCount = 0;

      for (const qr of selectedQrs) {
        try {
          await apiClient.post("/qr/regenerate", { tableId: qr.tableId });
          successCount++;
        } catch (e) {
          console.error(`Failed to regenerate QR for table ${qr.tableId}`, e);
        }
      }

      addToast(`Batch regenerated ${successCount} of ${selectedQrs.length} QR tokens successfully.`, "success");
      setIsBulkRegenOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Failed executing batch regeneration.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setSaving(true);
      let successCount = 0;

      for (const id of selectedIds) {
        try {
          await apiClient.delete(`/qr/${id}`);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete QR profile ${id}`, e);
        }
      }

      addToast(`Batch deleted ${successCount} of ${selectedIds.length} QR profiles.`, "success");
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast("Failed executing batch deletion.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl w-full animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const backendUrl = API_URL;

  return (
    <div className="space-y-6">
      {/* SCREEN CONTAINER (Hidden when printing) */}
      <div className="print:hidden space-y-6">
        {/* Stats widgets */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <QrIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total QR Codes</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{totalQrs}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-green-600">Active Profiles</p>
              <p className="text-xl font-bold text-green-600 mt-0.5">{activeQrs}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-blue-600">Total Scans</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{totalScans} scans</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-purple-600">Most Popular</p>
              <p className="text-sm font-bold text-slate-800 truncate max-w-[130px] mt-0.5" title={mostScanned?.table?.tableName}>
                {mostScanned?.table?.tableName || "None"} ({mostScanned?.scanCount || 0} scans)
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search table or token..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active QR Codes</option>
                <option value="inactive">Inactive QR Codes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerPrint(filteredQrs)}
              className="rounded-xl"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print QR Codes ({filteredQrs.length})
            </Button>
          </div>
        </div>

        {/* Bulk Selection Actions Strip */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-xs font-semibold">
              {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected for bulk actions
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkDownload("png")}
                className="inline-flex items-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
              >
                <Download className="h-3 w-3 mr-1.5" /> Download PNG
              </button>
              <button
                onClick={() => handleBulkDownload("svg")}
                className="inline-flex items-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
              >
                <Download className="h-3 w-3 mr-1.5" /> Download SVG
              </button>
              <button
                onClick={() => {
                  const toPrint = qrs.filter((q) => selectedIds.includes(q.id));
                  triggerPrint(toPrint);
                }}
                className="inline-flex items-center bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
              >
                <Printer className="h-3 w-3 mr-1.5" /> Print Cards
              </button>
              {canManage && (
                <>
                  <button
                    onClick={() => setIsBulkRegenOpen(true)}
                    className="inline-flex items-center bg-slate-800 hover:bg-amber-900 hover:text-amber-100 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" /> Regenerate
                  </button>
                  <button
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="inline-flex items-center bg-slate-800 hover:bg-red-950 hover:text-red-300 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* QR Code Cards Grid */}
        {filteredQrs.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <QrIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-900">No QR Code Profiles</h3>
              <p className="text-sm text-slate-500">
                {searchTerm || statusFilter !== "all"
                  ? "No QR codes match the current search filters."
                  : "Tables automatically get a QR code assigned. Check if you have dining tables added."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentItems.map((qr) => {
              const isSelected = selectedIds.includes(qr.id);
              return (
                <div
                  key={qr.id}
                  className={`bg-white rounded-2xl border transition shadow-sm overflow-hidden flex flex-col justify-between ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200"
                  } ${!qr.isActive ? "opacity-60" : ""}`}
                >
                  {/* Card top */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Checkbox and table detail */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(qr.id, e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{qr.table?.tableName}</h4>
                        </div>
                      </div>
                      <span className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        #{qr.table?.tableNumber}
                      </span>
                    </div>

                    <div className="text-[10px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-500 break-all select-all font-mono">
                      {restaurant?.domain 
                        ? `https://${restaurant.domain}/menu/${qr.qrToken}`
                        : `${typeof window !== "undefined" ? window.location.protocol : "https:"}//${restaurant?.subdomain || "menu"}.${typeof window !== "undefined" ? window.location.host : "huespire.digital"}/menu/${qr.qrToken}`
                      }
                    </div>

                    {/* QR Code image embed */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center aspect-square max-w-[160px] mx-auto relative group">
                      <img
                        src={`${backendUrl}/qr/image/${qr.qrToken}?format=png`}
                        alt={`Table ${qr.table?.tableNumber} QR`}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Stats & Scan info */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                      <span>Scans: <strong>{qr.scanCount || 0}</strong></span>
                      {qr.lastScannedAt ? (
                        <span>
                          Last:{" "}
                          <strong>
                            {new Date(qr.lastScannedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">Never Scanned</span>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => downloadSingleQR(qr, "png")}
                        className="p-1 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded transition cursor-pointer"
                        title="Download PNG"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadSingleQR(qr, "svg")}
                        className="p-1 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded transition cursor-pointer"
                        title="Download SVG"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => triggerPrint([qr])}
                        className="p-1 text-slate-500 hover:bg-slate-200 hover:text-indigo-600 rounded transition cursor-pointer"
                        title="Print QR Badge"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>

                    {canManage && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenRegen(qr)}
                          className="p-1 text-slate-500 hover:bg-amber-50 hover:text-amber-600 rounded transition cursor-pointer"
                          title="Regenerate QR Token"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(qr)}
                          className="p-1 text-red-400 hover:bg-red-50 hover:text-red-600 rounded transition cursor-pointer"
                          title="Delete/Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedIds.length === currentItems.length && currentItems.length > 0}
                onChange={handleSelectAll}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-medium">Select All on Page</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((p) => Math.max(p - 1, 1));
                  setSelectedIds([]);
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-xs font-semibold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((p) => Math.min(p + 1, totalPages));
                  setSelectedIds([]);
                }}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PRINT-ONLY EMBED CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block font-sans min-h-screen bg-white">
        <div className="grid grid-cols-2 gap-8 p-4">
          {printItems.map((item) => (
            <div
              key={item.id}
              className="border-2 border-dashed border-slate-400 p-8 rounded-3xl bg-white flex flex-col items-center justify-between text-center space-y-4 page-break-inside-avoid max-w-[320px] mx-auto shadow-sm"
              style={{ pageBreakInside: "avoid" }}
            >
              {/* Top Details */}
              <div className="space-y-1 w-full border-b pb-4 border-slate-100">
                {restaurant?.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-10 object-contain mx-auto mb-2"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs mx-auto mb-2">
                    {restaurant?.name ? restaurant.name[0] : "R"}
                  </div>
                )}
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{restaurant?.name || "Restaurant"}</h2>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl w-44 h-44 flex items-center justify-center mx-auto shadow-inner">
                <img
                  src={`${backendUrl}/qr/image/${item.qrToken}?format=png`}
                  alt={`Table ${item.table?.tableNumber} QR`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Table Info and Call to Action */}
              <div className="space-y-1 w-full pt-2">
                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {item.table?.tableName || `Table ${item.table?.tableNumber}`}
                </span>
                <h3 className="text-2xl font-black text-slate-950 mt-1">Table {item.table?.tableNumber}</h3>
                
                <div className="pt-3 border-t border-slate-100 mt-2">
                  <p className="text-xs font-bold text-indigo-600 tracking-wide uppercase animate-pulse">Scan to Order</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Please scan QR using your smartphone camera</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODALS SECTION */}
      {/* ------------------------------------------------------------- */}

      {/* Regenerate Single QR Modal */}
      <Modal
        isOpen={isRegenOpen}
        onClose={() => setIsRegenOpen(false)}
        title="Regenerate QR Token"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to regenerate the QR code for table{" "}
            <span className="font-semibold text-slate-800">
              "{selectedQr?.table?.tableName}" (#{selectedQr?.table?.tableNumber})
            </span>
            ?
          </p>
          <div className="flex items-start p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              Important: This action invalidates the previous public token immediately. The existing printed QR code will cease to function.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsRegenOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleRegenerate}>
              Regenerate Token
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete/Deactivate Single QR Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete QR Code Profile"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete the QR code profile for table{" "}
            <span className="font-semibold text-slate-800">
              "{selectedQr?.table?.tableName}" (#{selectedQr?.table?.tableNumber})
            </span>
            ?
          </p>
          <div className="flex items-start p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              Warning: Deleting the QR code profile leaves this table without a scan token. Customers will get a "QR Not Found" error.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Regenerate Modal */}
      <Modal
        isOpen={isBulkRegenOpen}
        onClose={() => setIsBulkRegenOpen(false)}
        title="Regenerate Selected QR Tokens"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to regenerate QR tokens for the{" "}
            <span className="font-semibold text-slate-800">{selectedIds.length} selected tables</span>?
          </p>
          <div className="flex items-start p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              Important: All existing printed QR codes for these selected tables will immediately become inactive and useless.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsBulkRegenOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleBulkRegenerate}>
              Regenerate All Selected
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title="Delete Selected QR Profiles"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete QR code profiles for the{" "}
            <span className="font-semibold text-slate-800">{selectedIds.length} selected tables</span>?
          </p>
          <div className="flex items-start p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              Warning: Selected tables will no longer have scanning capabilities. Customers will receive validation errors on scan.
            </p>
          </div>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={handleBulkDelete}>
              Delete All Selected
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
