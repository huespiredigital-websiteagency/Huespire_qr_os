"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { Plus, Edit2, Trash2, ShieldAlert, Check, X, Shield, Star, DollarSign, Activity } from "lucide-react";

export default function PlansPage() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);

  // Modal Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [setupFee, setSetupFee] = useState("0");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
  const [maxTables, setMaxTables] = useState("20");
  const [maxStaff, setMaxStaff] = useState("5");
  const [monthlyEmailLimit, setMonthlyEmailLimit] = useState("1000");
  const [customDomain, setCustomDomain] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [prioritySupport, setPrioritySupport] = useState(false);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/plans");
      if (res.data) {
        // Show all plans
        setPlans(res.data);
      }
    } catch (err) {
      console.error("Failed to load plans:", err);
      addToast("Failed to retrieve system subscription plans.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [addToast]);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!name.trim()) tempErrors.name = "Plan Name is required";
    if (name.length < 2 || name.length > 100) tempErrors.name = "Name must be between 2 and 100 characters";
    
    if (!code.trim()) tempErrors.code = "Plan Code is required";
    if (code.length < 2) tempErrors.code = "Plan Code must be at least 2 characters";

    if (isNaN(Number(setupFee)) || Number(setupFee) < 0) {
      tempErrors.setupFee = "Setup fee must be a positive number";
    }
    if (isNaN(Number(monthlyPrice)) || Number(monthlyPrice) < 0) {
      tempErrors.monthlyPrice = "Monthly price must be a positive number";
    }
    if (isNaN(Number(maxTables)) || Number(maxTables) < 1) {
      tempErrors.maxTables = "Max tables must be at least 1";
    }
    if (isNaN(Number(maxStaff)) || Number(maxStaff) < 1) {
      tempErrors.maxStaff = "Max staff must be at least 1";
    }
    if (isNaN(Number(monthlyEmailLimit)) || Number(monthlyEmailLimit) < 0) {
      tempErrors.monthlyEmailLimit = "Monthly email limit must be 0 or more";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setName("");
    setCode("");
    setDescription("");
    setSetupFee("0");
    setMonthlyPrice("0");
    setMaxTables("20");
    setMaxStaff("5");
    setMonthlyEmailLimit("1000");
    setCustomDomain(false);
    setAnalyticsEnabled(true);
    setPrioritySupport(false);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setSelectedPlan(plan);
    setName(plan.name || "");
    setCode(plan.code || "");
    setDescription(plan.description || "");
    setSetupFee(String(plan.setupFee || 0));
    setMonthlyPrice(String(plan.monthlyPrice || 0));
    setMaxTables(String(plan.maxTables || 20));
    setMaxStaff(String(plan.maxStaff || 5));
    setMonthlyEmailLimit(String(plan.monthlyEmailLimit || 1000));
    setCustomDomain(plan.customDomain || false);
    setAnalyticsEnabled(plan.analyticsEnabled ?? true);
    setPrioritySupport(plan.prioritySupport || false);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (plan: any) => {
    setSelectedPlan(plan);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name,
      code: code.toUpperCase().trim(),
      description: description || null,
      setupFee: Number(setupFee),
      monthlyPrice: Number(monthlyPrice),
      maxTables: Number(maxTables),
      maxStaff: Number(maxStaff),
      monthlyEmailLimit: Number(monthlyEmailLimit),
      customDomain,
      analyticsEnabled,
      prioritySupport,
    };

    try {
      setSaving(true);
      if (selectedPlan) {
        // Update Plan
        const res = await apiClient.patch(`/plans/${selectedPlan.id}`, payload);
        if (res.data) {
          addToast("Pricing plan updated successfully", "success");
          setIsModalOpen(false);
          fetchPlans();
        }
      } else {
        // Create Plan
        const res = await apiClient.post("/plans", payload);
        if (res.data) {
          addToast("New subscription plan registered", "success");
          setIsModalOpen(false);
          fetchPlans();
        }
      }
    } catch (err: any) {
      console.error("Failed to save plan:", err);
      addToast(err.response?.data?.message || "Failed to submit plan options.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    try {
      setSaving(true);
      await apiClient.delete(`/plans/${selectedPlan.id}`);
      addToast("Subscription plan deleted/disabled from directory", "success");
      setIsDeleteOpen(false);
      fetchPlans();
    } catch (err: any) {
      console.error("Failed to delete plan:", err);
      addToast(err.response?.data?.message || "Failed to remove plan tier.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Super Admin Clearance Required</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          You do not possess the necessary system clearances to access plans configurations.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Create, update, and manage global SaaS subscription pricing tiers.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Pricing Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Shield className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-900">No Pricing Tiers Defined</h3>
            <p className="text-sm text-slate-500">Create a plan to enable restaurant onboarding registrations.</p>
          </div>
          <Button onClick={handleOpenCreate} className="px-5 cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const monthlyPrice = Number(p.monthlyPrice);
            const setupFee = Number(p.setupFee);

            return (
              <div 
                key={p.id} 
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition ${
                  !p.isActive ? "opacity-75 bg-slate-50" : ""
                }`}
              >
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                        <span>{p.name}</span>
                        {!p.isActive && (
                          <span className="text-[10px] bg-slate-150 text-slate-500 border border-slate-250 px-2 py-0.5 rounded font-semibold">
                            Inactive
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block uppercase">
                        {p.code}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900">₹{monthlyPrice.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-slate-400">/ month</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 min-h-[32px]">{p.description || "No plan description provided."}</p>

                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">One-time Setup Fee:</span>
                      <span className="font-semibold text-slate-800">₹{setupFee.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Staff Accounts:</span>
                      <span className="font-semibold text-slate-800">{p.maxStaff >= 999999 ? "Unlimited" : p.maxStaff}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Tables:</span>
                      <span className="font-semibold text-slate-800">{p.maxTables >= 999999 ? "Unlimited" : p.maxTables}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Emails Limit:</span>
                      <span className="font-semibold text-slate-800">{p.monthlyEmailLimit.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                    {p.customDomain && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Custom Domain
                      </span>
                    )}
                    {p.analyticsEnabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
                        Analytics
                      </span>
                    )}
                    {p.prioritySupport && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        Priority Support
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    title="Edit Plan"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(p)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPlan ? "Edit Pricing Tier" : "Create Subscription Plan"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plan Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              placeholder="e.g. Starter"
            />
            <Input
              label="Unique Plan Code *"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!!selectedPlan}
              error={errors.code}
              placeholder="e.g. STARTER"
            />
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Plan Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of limits and support scope..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[64px]"
              />
            </div>
            <Input
              label="Monthly Price (INR) *"
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(e.target.value)}
              error={errors.monthlyPrice}
            />
            <Input
              label="Setup Fee (INR) *"
              type="number"
              value={setupFee}
              onChange={(e) => setSetupFee(e.target.value)}
              error={errors.setupFee}
            />
            <Input
              label="Max Staff Accounts *"
              type="number"
              value={maxStaff}
              onChange={(e) => setMaxStaff(e.target.value)}
              error={errors.maxStaff}
            />
            <Input
              label="Max Tables *"
              type="number"
              value={maxTables}
              onChange={(e) => setMaxTables(e.target.value)}
              error={errors.maxTables}
            />
            <Input
              label="Monthly Email Limit *"
              type="number"
              value={monthlyEmailLimit}
              onChange={(e) => setMonthlyEmailLimit(e.target.value)}
              error={errors.monthlyEmailLimit}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Features Clearances</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={customDomain}
                  onChange={(e) => setCustomDomain(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span>Custom Domain Map</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span>Analytics Enabled</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={prioritySupport}
                  onChange={(e) => setPrioritySupport(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span>Priority Support</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {selectedPlan ? "Save Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Plan Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete the plan <span className="font-semibold text-slate-900">"{selectedPlan?.name}"</span>? 
            This action is permanent and removes the tier configuration. Existing subscriptions attached to this tier will stay active, but no new workspaces can select it.
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
