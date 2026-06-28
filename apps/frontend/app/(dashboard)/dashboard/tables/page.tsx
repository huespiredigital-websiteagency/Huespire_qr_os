"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { Select } from "../../../../components/ui/select";
import {
  Table as TableIcon,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Users,
  AlertTriangle,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
  CheckCircle,
  Clock,
  Ban,
  Activity,
} from "lucide-react";

export default function TablesPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const role = user?.role || "STAFF";
  const canManage = ["SUPER_ADMIN", "OWNER", "MANAGER"].includes(role);
  const canUpdateStatus = ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER"].includes(role);
  const canView = ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER"].includes(role);

  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals Control
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields State
  const [tableName, setTableName] = useState("");
  const [tableNumber, setTableNumber] = useState<number | "">("");
  const [branchId, setBranchId] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState<number>(4);
  const [notes, setNotes] = useState("");
  const [tableStatus, setTableStatus] = useState("AVAILABLE");
  const [isActive, setIsActive] = useState(true);

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tableRes, branchRes, subRes] = await Promise.all([
        apiClient.get("/tables"),
        apiClient.get("/branches"),
        apiClient.get("/subscriptions/me"),
      ]);

      if (tableRes.data?.success) setTables(tableRes.data.data);
      if (branchRes.data?.success) setBranches(branchRes.data.data);
      if (subRes.data?.success) setSubscription(subRes.data.data);
    } catch (err: any) {
      console.error("Failed to load tables configurations:", err);
      addToast(err.response?.data?.message || "Failed to retrieve table data.", "error");
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
            You do not have administrative clearances to access Table Management. Please contact your manager if you require access.
          </p>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    if (!tableName.trim()) tempErrors.tableName = "Table Name is required";
    if (tableNumber === "" || Number(tableNumber) <= 0) {
      tempErrors.tableNumber = "Table Number must be a positive integer";
    }
    if (!branchId) tempErrors.branchId = "Branch assignment is required";
    if (seatingCapacity <= 0) {
      tempErrors.seatingCapacity = "Capacity must be positive";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleOpenAdd = () => {
    if (branches.length === 0) {
      addToast("Please create a branch location first before adding tables.", "warning");
      return;
    }
    setSelectedTable(null);
    setTableName("");
    setTableNumber("");
    setBranchId(branches[0]?.id || "");
    setSeatingCapacity(4);
    setNotes("");
    setTableStatus("AVAILABLE");
    setIsActive(true);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (table: any) => {
    setSelectedTable(table);
    setTableName(table.tableName || "");
    setTableNumber(table.tableNumber || "");
    setBranchId(table.branchId || "");
    setSeatingCapacity(table.seatingCapacity || 4);
    setNotes(table.notes || "");
    setTableStatus(table.status || "AVAILABLE");
    setIsActive(table.isActive);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenStatusUpdate = (table: any) => {
    setSelectedTable(table);
    setTableStatus(table.status || "AVAILABLE");
    setIsStatusModalOpen(true);
  };

  const handleOpenDelete = (table: any) => {
    setSelectedTable(table);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        tableName,
        tableNumber: Number(tableNumber),
        branchId,
        seatingCapacity: Number(seatingCapacity),
        notes: notes || undefined,
        status: tableStatus,
        isActive,
      };

      let response;
      if (selectedTable) {
        response = await apiClient.patch(`/tables/${selectedTable.id}`, payload);
      } else {
        response = await apiClient.post("/tables", payload);
      }

      if (response.data?.success) {
        addToast(
          selectedTable
            ? "Table configuration updated successfully"
            : "Table and unique QR code created successfully",
          "success"
        );
        setIsFormOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error("Failed to save table:", err);
      addToast(err.response?.data?.message || "Error saving table configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    try {
      setSaving(true);
      const response = await apiClient.patch(`/tables/${selectedTable.id}`, {
        status: tableStatus,
      });

      if (response.data?.success) {
        addToast("Table dining status updated successfully", "success");
        setIsStatusModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      addToast(err.response?.data?.message || "Error updating dining status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTable) return;
    try {
      setSaving(true);
      const response = await apiClient.delete(`/tables/${selectedTable.id}`);
      if (response.data?.success) {
        addToast("Table soft deleted successfully. Active orders halted.", "success");
        setIsDeleteOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error("Failed to delete table:", err);
      addToast(err.response?.data?.message || "Error deleting table.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-12 bg-slate-200 rounded-xl w-full animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Quota Metrics
  const maxTables = subscription?.maxTables || 20;
  const currentTablesCount = tables.length;
  const isQuotaReached = currentTablesCount >= maxTables;

  // Compute status statistics
  const stats = {
    total: tables.length,
    available: tables.filter((t) => t.status === "AVAILABLE").length,
    occupied: tables.filter((t) => t.status === "OCCUPIED").length,
    reserved: tables.filter((t) => t.status === "RESERVED").length,
    cleaning: tables.filter((t) => t.status === "CLEANING").length,
    outOfService: tables.filter((t) => t.status === "OUT_OF_SERVICE").length,
  };

  // Filtering
  const filteredTables = tables.filter((table) => {
    const matchesSearch =
      table.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.tableNumber.toString().includes(searchTerm);
    const matchesBranch = branchFilter === "all" || table.branchId === branchFilter;
    const matchesStatus = statusFilter === "all" || table.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTables.slice(indexOfFirstItem, indexOfLastItem);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-50 text-green-700 border-green-200";
      case "OCCUPIED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "RESERVED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CLEANING":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "OUT_OF_SERVICE":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Quota banner if reached */}
      {isQuotaReached && canManage && (
        <div className="flex items-start p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Subscription Table Limit Reached</h4>
            <p className="text-xs text-amber-700 mt-1">
              Your subscription limits table creation to {maxTables}. Upgrade your package plan from the Subscription portal to expand dining capacity.
            </p>
          </div>
        </div>
      )}

      {/* Stats Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-slate-500">Total Tables</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {stats.total} <span className="text-xs font-medium text-slate-400">/ {maxTables}</span>
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-green-600">Available</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.available}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-amber-600">Occupied</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.occupied}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-blue-600">Reserved</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.reserved}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-purple-600">Cleaning</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.cleaning}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-red-600">Out of Svc</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.outOfService}</p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search table name/number..."
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
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer focus:outline-none"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="OCCUPIED">OCCUPIED</option>
            <option value="RESERVED">RESERVED</option>
            <option value="CLEANING">CLEANING</option>
            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
          </select>
        </div>

        {/* View Mode & Add Button */}
        <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0">
          <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {canManage && (
            <Button onClick={handleOpenAdd} disabled={isQuotaReached} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid/List */}
      {filteredTables.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <TableIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-900">No Dining Tables Found</h3>
            <p className="text-sm text-slate-500">
              {searchTerm || branchFilter !== "all" || statusFilter !== "all"
                ? "No tables match the current search filters."
                : "Get started by adding your dining tables layout."}
            </p>
          </div>
          {canManage && !isQuotaReached && (
            <Button onClick={handleOpenAdd} className="px-5">
              <Plus className="h-4 w-4 mr-2" />
              Add First Table
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {currentItems.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-2xl border transition shadow-sm overflow-hidden flex flex-col justify-between ${
                table.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-slate-900">{table.tableName}</h3>
                    <p className="text-xs text-slate-400">Branch: {table.branch?.name}</p>
                  </div>
                  <span className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    #{table.tableNumber}
                  </span>
                </div>

                {/* Statistics line */}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>Capacity: {table.seatingCapacity} seats</span>
                  </div>
                  {!table.isActive && (
                    <span className="text-red-500 font-semibold uppercase tracking-wider text-[10px]">Inactive</span>
                  )}
                </div>

                {/* Status Badge */}
                <div className="pt-2">
                  <span
                    onClick={() => canUpdateStatus && handleOpenStatusUpdate(table)}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer hover:opacity-85 transition ${getStatusBadgeClass(
                      table.status
                    )}`}
                    title={canUpdateStatus ? "Click to change status" : ""}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                    {table.status.replace("_", " ")}
                  </span>
                </div>

                {table.notes && (
                  <p className="text-[11px] text-slate-400 italic mt-2 line-clamp-2" title={table.notes}>
                    Notes: {table.notes}
                  </p>
                )}
              </div>

              {/* Actions footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  QR ID: {table.qrCode?.qrToken ? `${table.qrCode.qrToken.substring(0, 8)}...` : "None"}
                </span>

                <div className="flex space-x-1.5">
                  {canUpdateStatus && (
                    <button
                      onClick={() => handleOpenStatusUpdate(table)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                      title="Update Status"
                    >
                      <Activity className="h-4 w-4" />
                    </button>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(table)}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(table)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition cursor-pointer"
                        title="Delete Table"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="px-6 py-3">Number</th>
                  <th className="px-6 py-3">Display Name</th>
                  <th className="px-6 py-3">Branch Location</th>
                  <th className="px-6 py-3">Capacity</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((table) => (
                  <tr key={table.id} className={`hover:bg-slate-50/50 ${!table.isActive ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4 font-bold text-slate-800">#{table.tableNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{table.tableName}</td>
                    <td className="px-6 py-4 text-slate-500">{table.branch?.name}</td>
                    <td className="px-6 py-4 text-slate-600">{table.seatingCapacity} seats</td>
                    <td className="px-6 py-4 text-slate-400 italic text-xs max-w-[150px] truncate">{table.notes || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        onClick={() => canUpdateStatus && handleOpenStatusUpdate(table)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border cursor-pointer hover:opacity-85 ${getStatusBadgeClass(
                          table.status
                        )}`}
                      >
                        {table.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {canUpdateStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatusUpdate(table)}
                            className="h-8 px-2"
                            title="Update Status"
                          >
                            Status
                          </Button>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(table)}
                              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Table"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(table)}
                              className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Table"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{indexOfFirstItem + 1}</span> to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(indexOfLastItem, filteredTables.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{filteredTables.length}</span> tables
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedTable ? "Edit Table Details" : "Create Dining Table"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Table Display Name *"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              error={errors.tableName}
              placeholder="e.g. Window Couple Table"
            />
            <Input
              label="Table Number *"
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value === "" ? "" : Number(e.target.value))}
              error={errors.tableNumber}
              placeholder="e.g. 5"
              min="1"
            />
            <Select
              label="Assigned Branch *"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              error={errors.branchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <Input
              label="Seating Capacity *"
              type="number"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(Number(e.target.value))}
              error={errors.seatingCapacity}
              placeholder="e.g. 4"
              min="1"
            />
            <div className="sm:col-span-2">
              <Select
                label="Dining Status"
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value)}
                options={[
                  { value: "AVAILABLE", label: "AVAILABLE" },
                  { value: "OCCUPIED", label: "OCCUPIED" },
                  { value: "RESERVED", label: "RESERVED" },
                  { value: "CLEANING", label: "CLEANING" },
                  { value: "OUT_OF_SERVICE", label: "OUT OF SERVICE" },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Active Status</label>
              <div className="flex items-center space-x-4 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-slate-700">Table Active (Customers can scan & order)</span>
                </label>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or locations details..."
                className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {selectedTable ? "Save Changes" : "Create Table"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Status Update Modal (For Waiters/Managers) */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Change Status - ${selectedTable?.tableName || "Table"}`}
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <Select
            label="Current Dining Table Status"
            value={tableStatus}
            onChange={(e) => setTableStatus(e.target.value)}
            options={[
              { value: "AVAILABLE", label: "AVAILABLE (Ready for new customers)" },
              { value: "OCCUPIED", label: "OCCUPIED (Customers currently eating)" },
              { value: "RESERVED", label: "RESERVED (Reserved for upcoming guests)" },
              { value: "CLEANING", label: "CLEANING (Under clean up protocol)" },
              { value: "OUT_OF_SERVICE", label: "OUT OF SERVICE (Maintenance/Damaged)" },
            ]}
          />
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Update Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Table Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete table{" "}
            <span className="font-semibold text-slate-800">
              "{selectedTable?.tableName}" (#{selectedTable?.tableNumber})
            </span>
            ? This operation will soft-delete the table configuration.
          </p>
          <div className="flex items-start p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 space-x-2.5">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-medium">
              Note: This deactivates the associated QR Code immediately. Scans by customers will return a "Table Unavailable" warning.
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
    </div>
  );
}
