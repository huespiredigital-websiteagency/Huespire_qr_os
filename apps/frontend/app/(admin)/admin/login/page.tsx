"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Shield, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { apiClient } from "../../../../lib/api-client";

export default function AdminLoginPage() {
  const { user, login, isInitializing, restoreSession } = useAuthStore();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Redirect if already authenticated as SUPER_ADMIN
  useEffect(() => {
    if (!isInitializing && user && user.role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, isInitializing, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      if (response.data?.success && response.data.data) {
        const { accessToken, user: userData } = response.data.data;
        
        if (userData.role !== "SUPER_ADMIN") {
          setError("Access Denied: Only platform administrators can log into this console.");
          return;
        }

        login(accessToken, userData);
        router.push("/admin/dashboard");
      } else {
        setError("Invalid credentials or login failed.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Incorrect email/password or server connection failed."
      );
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute top-[-30%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.06)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 items-center justify-center text-indigo-400 mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Operator Control Center</h1>
          <p className="text-slate-400 text-xs font-semibold leading-relaxed">
            Authorized Super Admin Login Gateway
          </p>
        </div>

        {/* Error alert box */}
        {error && (
          <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-xs animate-shake">
            <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@platform.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-600 text-white focus:outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm placeholder-slate-600 text-white focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Sign In Operator Panel
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
