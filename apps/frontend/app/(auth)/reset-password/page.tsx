"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { useUIStore } from "../../../lib/store/ui-store";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Lock, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

function ResetPasswordComponent() {
  const { addToast } = useUIStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Token is missing. Request a new link from the forgot password page.");
      return;
    }
    if (!password.trim()) {
      setError("Password cannot be blank.");
      return;
    }
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");

    try {
      setLoading(true);
      const response = await apiClient.post("/auth/reset-password", {
        token,
        newPassword: password,
      });

      if (response.data?.success) {
        setSuccess(true);
        addToast("Password changed successfully!", "success");
      }
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.message || "Failed to update password. Link might be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-white text-xl font-black">Choose New Password</h2>
        <p className="text-slate-500 text-xs font-semibold">
          Update the login credentials for your owner account.
        </p>
      </div>

      {success ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-xs text-slate-300 font-semibold max-w-xs leading-relaxed">
              Your password has been successfully updated. You can now use your new password to sign in.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 transition"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="New Password *"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />

          <Input
            label="Confirm New Password *"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retype password"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-4 rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            Update Credentials
          </Button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full text-slate-500 hover:text-slate-350 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center flex flex-col items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <ResetPasswordComponent />
    </Suspense>
  );
}
