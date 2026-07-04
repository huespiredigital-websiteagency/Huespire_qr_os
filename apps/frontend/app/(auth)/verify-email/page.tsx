"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api-client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setSuccess(false);
        setErrorMsg("Activation token is missing.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.post("/auth/verify-email", { token });
        if (response.data?.success) {
          setSuccess(true);
        } else {
          setSuccess(false);
          setErrorMsg(response.data?.message || "Verification failed.");
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setSuccess(false);
        setErrorMsg(err.response?.data?.message || "This verification link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center space-y-6">
      {loading ? (
        <div className="py-8 space-y-4 flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          <h2 className="text-white text-lg font-bold">Verifying your account...</h2>
          <p className="text-slate-500 text-xs font-semibold">Please wait while we validate your activation token.</p>
        </div>
      ) : success ? (
        <div className="py-4 space-y-4 flex flex-col items-center">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-white text-xl font-black">Email Verified!</h2>
          <p className="text-slate-400 text-xs font-semibold max-w-xs mx-auto">
            Your restaurant owner account is now fully verified. You can log in and start configuring your workspace.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/10 active:scale-95 transition"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <div className="py-4 space-y-4 flex flex-col items-center">
          <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl">
            <XCircle className="h-12 w-12" />
          </div>
          <h2 className="text-white text-xl font-black">Verification Failed</h2>
          <p className="text-rose-400 text-xs font-bold bg-rose-500/5 border border-rose-500/10 rounded-xl px-4 py-2 w-full">
            {errorMsg}
          </p>
          <p className="text-slate-500 text-[10px] max-w-xs mx-auto">
            If you need a new link, contact your platform administrator or try registering your tenant subdomain again.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-slate-950 hover:bg-slate-850 text-slate-400 font-extrabold text-xs py-3.5 border border-slate-800 rounded-xl cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl w-full max-w-md shadow-2xl text-center flex flex-col items-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <VerifyEmailComponent />
    </Suspense>
  );
}
