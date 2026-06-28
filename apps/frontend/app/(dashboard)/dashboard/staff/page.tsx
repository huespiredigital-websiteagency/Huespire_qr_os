"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Select } from "../../../../components/ui/select";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { Users, Plus, Edit2, Trash2, Shield, ToggleLeft, ToggleRight, Key, AlertTriangle } from "lucide-react";

export default function StaffPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPasswordDisplayOpen, setIsPasswordDisplayOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");

  // Form Fields State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleCode, setRoleCode] = useState("WAITER");
  const [isActive, setIsActive] = useState(true);

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchStaffAndSubscription = async () => {
    try {
      setLoading(true);
      const [staffRes, subRes] = await Promise.all([
        apiClient.get("/staff"),
        apiClient.get("/subscriptions/me"),
      ]);

      if (staffRes.data?.success) setStaffList(staffRes.data.data);
      if (subRes.data?.success) setSubscription(subRes.data.data);
    } catch (err) {
      console.error("Failed to load staff data:", err);
      addToast("Failed to retrieve staff configurations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndSubscription();
  }, [addToast]);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!firstName.trim()) tempErrors.firstName = "First Name is required";
    
    if (!selectedStaff) {
      // Email is only input on Invite
      if (!email.trim()) {
        tempErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        tempErrors.email = "Invalid email format";
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleOpenInvite = () => {
    setSelectedStaff(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRoleCode("WAITER");
    setIsActive(true);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: any) => {
    setSelectedStaff(staff);
    setFirstName(staff.firstName || "");
    setLastName(staff.lastName || "");
    setEmail(staff.email || "");
    setPhone(staff.phone || "");
    setRoleCode(staff.role || "WAITER");
    setIsActive(staff.isActive);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenDelete = (staff: any) => {
    setSelectedStaff(staff);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      
      if (selectedStaff) {
        // Edit Staff Member
        const response = await apiClient.patch(`/staff/${selectedStaff.id}`, {
          firstName,
          lastName: lastName || null,
          phone: phone || null,
          roleCode,
          isActive,
        });

        if (response.data?.success) {
          addToast("Staff configurations updated successfully", "success");
          setIsModalOpen(false);
          fetchStaffAndSubscription();
        }
      } else {
        // Invite Staff Member
        const response = await apiClient.post("/staff/invite", {
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          roleCode,
        });

        if (response.data?.success) {
          addToast("Staff onboarded successfully", "success");
          setIsModalOpen(false);
          setTemporaryPassword(response.data.data.temporaryPassword);
          setIsPasswordDisplayOpen(true);
          fetchStaffAndSubscription();
        }
      }
    } catch (err: any) {
      console.error("Failed to save staff:", err);
      addToast(err.response?.data?.message || "Error saving staff member.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    try {
      setSaving(true);
      const response = await apiClient.delete(`/staff/${selectedStaff.id}`);
      if (response.data?.success) {
        addToast("Staff account soft deleted successfully", "success");
        setIsDeleteOpen(false);
        fetchStaffAndSubscription();
      }
    } catch (err: any) {
      console.error("Failed to delete staff:", err);
      addToast(err.response?.data?.message || "Error deleting staff member.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff: any) => {
    try {
      const response = await apiClient.patch(`/staff/${staff.id}`, {
        isActive: !staff.isActive,
      });
      if (response.data?.success) {
        addToast(`Staff member ${staff.isActive ? "deactivated" : "activated"} successfully`, "success");
        fetchStaffAndSubscription();
      }
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      addToast(err.response?.data?.message || "Error updating status.", "error");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const maxStaff = subscription?.maxStaff || 5;
  const currentStaff = staffList.length;
  const isQuotaReached = currentStaff >= maxStaff;

  const roleOptions = [
    { value: "MANAGER", label: "Manager" },
    { value: "WAITER", label: "Waiter" },
    { value: "KITCHEN", label: "Kitchen Staff" },
    { value: "CASHIER", label: "Cashier" },
  ];

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Active Accounts: {currentStaff} of {maxStaff === 999999 ? "Unlimited" : maxStaff} allowed
          </p>
        </div>
        <Button onClick={handleOpenInvite} disabled={isQuotaReached} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Invite Staff Member
        </Button>
      </div>

      {/* Quota limit warning */}
      {isQuotaReached && (
        <div className="flex items-start p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Staff Account Limit Reached</h4>
            <p className="text-xs text-amber-700 mt-1">
              Your subscription limits staff count to {maxStaff}. Please upgrade your package plan to add more staff accounts.
            </p>
          </div>
        </div>
      )}

      {/* Staff Table */}
      {staffList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-900">No Staff Members</h3>
            <p className="text-sm text-slate-500">Get started by inviting your first team member.</p>
          </div>
          <Button onClick={handleOpenInvite} className="px-5 cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Invite Staff
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {s.firstName} {s.lastName || ""}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{s.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {s.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => s.role !== "OWNER" && handleToggleStatus(s)}
                        disabled={s.role === "OWNER"}
                        className={`inline-flex items-center space-x-1 font-semibold focus:outline-none transition ${
                          s.role === "OWNER" ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                        }`}
                      >
                        {s.isActive ? (
                          <>
                            <ToggleRight className="h-6 w-6 text-green-500" />
                            <span className="text-green-700 text-xs">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-6 w-6 text-slate-400" />
                            <span className="text-slate-500 text-xs">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {s.role !== "OWNER" && (
                          <button
                            onClick={() => handleOpenDelete(s)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Invite / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedStaff ? "Modify Staff Configurations" : "Invite/Onboard Staff Member"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
              placeholder="John"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
            {!selectedStaff && (
              <div className="sm:col-span-2">
                <Input
                  label="Contact Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  placeholder="name@restaurant.com"
                />
              </div>
            )}
            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
            />
            <Select
              label="Assigned System Role *"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              options={roleOptions}
              disabled={selectedStaff?.role === "OWNER"}
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {selectedStaff ? "Save Configurations" : "Send Onboarding Invitation"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Password Display Modal */}
      <Modal
        isOpen={isPasswordDisplayOpen}
        onClose={() => setIsPasswordDisplayOpen(false)}
        title="Staff Member Onboarded!"
      >
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 mx-auto">
            <Key className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              The staff profile was created. Please supply them with the following temporary password for initial log in:
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-lg font-bold tracking-widest select-all">
              {temporaryPassword}
            </div>
            <p className="text-xs text-amber-600 font-medium">
              Important: This password is shown only once and will not be displayed again.
            </p>
          </div>
          <div className="flex items-center justify-center pt-4">
            <Button className="px-8 cursor-pointer" onClick={() => setIsPasswordDisplayOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Staff Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove staff member <span className="font-semibold text-slate-800">"{selectedStaff?.firstName} {selectedStaff?.lastName || ""}"</span>? 
            This operation soft-deactivates their login credentials.
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
