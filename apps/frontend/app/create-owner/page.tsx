"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Sparkles, Loader2, CheckCircle2, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";

export default function CreateOwnerPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  // Auto-generate name from email prefix if empty
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (!name && val.includes("@")) {
      const prefix = val.split("@")[0];
      const formattedName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      setName(formattedName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    // If name is still empty, fallback
    const finalName = name.trim() || "Test Owner";

    try {
      const res = await apiClient.post("/auth/register", {
        name: finalName,
        email: email.trim(),
        password: password
      });

      if (res.data?.success) {
        setSuccessData({
          email: email.trim(),
          name: finalName,
          restaurantName: res.data.data?.restaurantName || `${finalName}'s Kitchen`,
          subdomain: res.data.data?.subdomain || ""
        });
      } else {
        setError("Failed to register owner. Please try again.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans relative overflow-hidden">
        {/* Soft background ambient glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(15,81,50,0.035)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md bg-white border border-neutral-100 p-8 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-6 text-center animate-[fadeInUp_0.5s_ease-out_both]">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-slate-850 tracking-tight">Onboarding Successful</h1>
            <p className="text-xs text-slate-400 font-semibold">Test account and restaurant created successfully</p>
          </div>

          <div className="bg-[#faf9f6] border border-neutral-100 rounded-2xl p-5 space-y-3.5 text-left text-sm">
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-slate-400 font-medium">Name:</span>
              <span className="font-bold text-slate-700">{successData.name}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className="font-bold text-slate-700">{successData.email}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-100 pb-2">
              <span className="text-slate-400 font-medium">Restaurant:</span>
              <span className="font-bold text-[#0f5132]">{successData.restaurantName}</span>
            </div>
            {successData.subdomain && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Subdomain:</span>
                <span className="font-bold text-slate-700">{successData.subdomain}</span>
              </div>
            )}
          </div>

          <Link
            href="/login"
            className="w-full py-3.5 px-6 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm"
          >
            Go to Login Portal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans relative overflow-hidden">
      {/* Soft background ambient glow */}
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(15,81,50,0.035)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white border border-neutral-100 p-8 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1 bg-[#0f5132]/8 border border-[#0f5132]/10 rounded-full px-3 py-1 text-[9px] font-extrabold text-[#0f5132] tracking-wider uppercase">
            <Sparkles className="w-3 h-3" />
            Testing Tool
          </div>
          <h1 className="text-2xl font-black text-slate-850 tracking-tight">Onboard Test Owner</h1>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            Create an owner account and register a new restaurant instantly.
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl p-3.5 text-xs animate-[shake_0.4s_ease-in-out]">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="owner@restaurant.com"
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-neutral-200 focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132] rounded-xl text-sm placeholder-slate-350 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-neutral-200 focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132] rounded-xl text-sm placeholder-slate-350 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Owner Name</label>
              <span className="text-[9px] font-bold text-slate-350 uppercase">Auto-generated</span>
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-neutral-200 focus:border-[#0f5132] focus:ring-1 focus:ring-[#0f5132] rounded-xl text-sm placeholder-slate-350 focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-sm rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering Account...
              </>
            ) : (
              <>
                Onboard Owner & Restaurant
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-100 flex justify-between items-center text-xs">
          <Link href="/login" className="text-slate-400 hover:text-slate-600 transition-colors font-medium">
            Back to login
          </Link>
          <span className="text-slate-350 font-semibold text-[10px]">v1.0.0</span>
        </div>
      </div>

      {/* Shake animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
