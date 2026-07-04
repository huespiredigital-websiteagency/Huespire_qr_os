"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { useUIStore } from "../../../lib/store/ui-store";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { addToast } = useUIStore();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email address is required");
      return;
    }
    setError("");

    try {
      setLoading(true);
      const response = await apiClient.post("/auth/forgot-password", { email });
      if (response.data?.success) {
        setSubmitted(true);
        addToast("Password reset link dispatched!", "success");
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(err.response?.data?.message || "Failed to trigger reset. Verify your email is correct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center">
          <KeyRound className="h-6 w-6" />
        </div>
        <h2 className="text-white text-xl font-black">Reset Password</h2>
        <p className="text-slate-500 text-xs font-semibold">
          Enter your registered email to request a secure password recovery link.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-6 text-center">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex flex-col items-center gap-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-xs text-slate-300 font-semibold max-w-xs leading-relaxed">
              If an account is registered to <strong>{email}</strong>, we have dispatched a password reset link valid for 30 minutes.
            </p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 font-extrabold text-xs py-3.5 rounded-xl cursor-pointer"
          >
            Back to Login
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
            label="Account Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@restaurant.com"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-4 rounded-xl shadow-lg shadow-indigo-600/15 cursor-pointer"
          >
            Send Recovery Link
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
