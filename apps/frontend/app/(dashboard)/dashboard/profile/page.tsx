"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { User, Lock, Key, Mail, Phone, Badge, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      // Fetch fresh profile data to fill avatarUrl & phone
      const fetchFreshProfile = async () => {
        try {
          setLoading(true);
          const res = await apiClient.get("/auth/me");
          if (res.data?.success && res.data.data) {
            const data = res.data.data;
            setFirstName(data.firstName || "");
            setLastName(data.lastName || "");
            setPhone(data.phone || "");
            setAvatarUrl(data.avatarUrl || "");
            // Update store as well
            updateProfile({
              firstName: data.firstName,
              lastName: data.lastName,
            });
          }
        } catch (err) {
          console.error("Failed to load profile details:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchFreshProfile();
    }
  }, [user, updateProfile]);

  const validateProfile = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) {
      errors.firstName = "First Name is required";
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters long";
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProfile()) return;

    try {
      setSavingProfile(true);
      const res = await apiClient.patch("/users/profile", {
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        avatarUrl: avatarUrl || null,
      });

      if (res.data?.success) {
        addToast("Profile details updated successfully", "success");
        // Update local auth store
        updateProfile({
          firstName,
          lastName,
        });
      }
    } catch (err: any) {
      console.error("Profile update failed:", err);
      addToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    try {
      setSavingPassword(true);
      const res = await apiClient.put("/users/password", {
        currentPassword,
        newPassword,
      });

      if (res.status === 200 || res.data?.success) {
        addToast("Security password updated successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      console.error("Password change failed:", err);
      addToast(err.response?.data?.message || "Failed to change password. Make sure current password is correct.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading && !firstName) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-80 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Personal details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
              <p className="text-xs text-slate-500">Configure your profile contact settings.</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {avatarUrl && (
              <div className="flex items-center space-x-4">
                <img 
                  src={avatarUrl} 
                  alt="Avatar Preview" 
                  className="h-16 w-16 rounded-full object-cover border border-slate-200 bg-slate-50"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <p className="text-xs font-semibold text-slate-400">Avatar Image Preview</p>
                  <p className="text-[10px] text-slate-400">Specify an image URL below to change avatar.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={profileErrors.firstName}
                placeholder="John"
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Account Email (Read-Only)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Contact administration to update your registered email address.
              </p>
            </div>

            <Input
              label="Contact Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
            />

            <Input
              label="Avatar Image URL"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 uppercase tracking-wide">
                Role: {user?.role}
              </span>
              <Button type="submit" loading={savingProfile}>
                Save Details
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Security/Password change */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <p className="text-xs text-slate-500">Update account login credentials regularly.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Current Password *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`block w-full rounded-xl border pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    passwordErrors.currentPassword ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                />
              </div>
              {passwordErrors.currentPassword && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                New Password *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`block w-full rounded-xl border pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    passwordErrors.newPassword ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                />
              </div>
              {passwordErrors.newPassword && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Confirm New Password *
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`block w-full rounded-xl border pl-10 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    passwordErrors.confirmPassword ? "border-red-300 focus:ring-red-500" : "border-slate-200"
                  }`}
                />
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <Button type="submit" variant="primary" loading={savingPassword}>
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
