"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { GitBranch, MapPin, Phone, Mail, Plus, Edit2, Trash2, Clock, AlertTriangle } from "lucide-react";

export default function BranchesPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("22:00");

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchBranchesAndSubscription = async () => {
    try {
      setLoading(true);
      const [branchRes, subRes] = await Promise.all([
        apiClient.get("/branches"),
        apiClient.get("/subscriptions/me"),
      ]);

      if (branchRes.data?.success) setBranches(branchRes.data.data);
      if (subRes.data?.success) setSubscription(subRes.data.data);
    } catch (err) {
      console.error("Failed to load branches data:", err);
      addToast("Failed to retrieve branch configurations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchesAndSubscription();
  }, [addToast]);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!name.trim()) tempErrors.name = "Branch Name is required";
    
    const codeRegex = /^[A-Z0-9_-]+$/;
    if (!code.trim()) {
      tempErrors.code = "Branch Code is required";
    } else if (!codeRegex.test(code)) {
      tempErrors.code = "Must contain uppercase letters, numbers, hyphens, or underscores";
    }

    if (email.trim() && !/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = "Invalid email format";
    }
    if (!address.trim()) tempErrors.address = "Address is required";
    if (!city.trim()) tempErrors.city = "City is required";
    if (!state.trim()) tempErrors.state = "State is required";
    
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!openingTime.trim() || !timeRegex.test(openingTime)) {
      tempErrors.openingTime = "Opening Time must be in HH:MM format";
    }
    if (!closingTime.trim() || !timeRegex.test(closingTime)) {
      tempErrors.closingTime = "Closing Time must be in HH:MM format";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleOpenAdd = () => {
    setSelectedBranch(null);
    setName("");
    setCode("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setState("");
    setCountry("India");
    setOpeningTime("09:00");
    setClosingTime("22:00");
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: any) => {
    setSelectedBranch(branch);
    setName(branch.name || "");
    setCode(branch.code || "");
    setPhone(branch.phone || "");
    setEmail(branch.email || "");
    setAddress(branch.address || "");
    setCity(branch.city || "");
    setState(branch.state || "");
    setCountry(branch.country || "India");
    setOpeningTime(branch.openingTime || "09:00");
    setClosingTime(branch.closingTime || "22:00");
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (branch: any) => {
    setSelectedBranch(branch);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        name,
        code: code.toUpperCase(),
        phone: phone || null,
        email: email || null,
        address,
        city,
        state,
        country,
        openingTime,
        closingTime,
      };

      let response;
      if (selectedBranch) {
        // Edit Branch
        response = await apiClient.patch(`/branches/${selectedBranch.id}`, payload);
      } else {
        // Create Branch
        response = await apiClient.post("/branches", payload);
      }

      if (response.data?.success) {
        addToast(
          selectedBranch
            ? "Branch configurations updated successfully"
            : "Branch created successfully",
          "success"
        );
        setIsModalOpen(false);
        fetchBranchesAndSubscription();
      }
    } catch (err: any) {
      console.error("Failed to save branch:", err);
      addToast(err.response?.data?.message || "Error saving branch configurations.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBranch) return;
    try {
      setSaving(true);
      const response = await apiClient.delete(`/branches/${selectedBranch.id}`);
      if (response.data?.success) {
        addToast("Branch location soft deleted successfully", "success");
        setIsDeleteOpen(false);
        fetchBranchesAndSubscription();
      }
    } catch (err: any) {
      console.error("Failed to delete branch:", err);
      addToast(err.response?.data?.message || "Error deleting branch.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxBranches = subscription?.maxBranches || 1;
  const currentBranches = branches.length;
  const isQuotaReached = currentBranches >= maxBranches;

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Active Branches: {currentBranches} of {maxBranches} allowed
          </p>
        </div>
        <Button onClick={handleOpenAdd} disabled={isQuotaReached} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create New Branch
        </Button>
      </div>

      {/* Quota limit warning */}
      {isQuotaReached && (
        <div className="flex items-start p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Branch Quota Limit Reached</h4>
            <p className="text-xs text-amber-700 mt-1">
              Your subscription limits branch count to {maxBranches}. Please upgrade your package plan to add more branches.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {branches.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <GitBranch className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-900">No Branch Locations</h3>
            <p className="text-sm text-slate-500">Get started by creating your first branch outlet.</p>
          </div>
          <Button onClick={handleOpenAdd} className="px-5 cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Branch
          </Button>
        </div>
      ) : (
        /* Cards list grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              {/* Card top */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-slate-900">{b.name}</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Code: {b.code}
                    </span>
                  </div>
                  {b.isMainBranch && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                      Main Branch
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>{b.address}, {b.city}, {b.state}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span>{b.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{b.openingTime} - {b.closingTime}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  title="Edit Settings"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                {!b.isMainBranch && (
                  <button
                    onClick={() => handleOpenDelete(b)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete Branch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBranch ? "Modify Branch Details" : "Create New Branch Outlet"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Branch Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="e.g. Connaught Place Out"
            />
            <Input
              label="Unique Branch Code *"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={errors.code}
              placeholder="e.g. CP-01"
              disabled={!!selectedBranch} // Prevent modification of code for safety
            />
            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              placeholder="+919876543210"
            />
            <Input
              label="Contact Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="email@branch.com"
            />
            <div className="sm:col-span-2">
              <Input
                label="Street Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={errors.address}
                placeholder="456 Main Avenue"
              />
            </div>
            <Input
              label="City *"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={errors.city}
              placeholder="Delhi"
            />
            <Input
              label="State *"
              value={state}
              onChange={(e) => setState(e.target.value)}
              error={errors.state}
              placeholder="Delhi"
            />
            <Input
              label="Opening Time (HH:MM) *"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              error={errors.openingTime}
              placeholder="09:00"
            />
            <Input
              label="Closing Time (HH:MM) *"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
              error={errors.closingTime}
              placeholder="22:00"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {selectedBranch ? "Save Changes" : "Create Outlet"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Branch Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete branch outlet <span className="font-semibold text-slate-800">"{selectedBranch?.name}"</span>? 
            This operation will soft-delete the branch configurations.
          </p>
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
