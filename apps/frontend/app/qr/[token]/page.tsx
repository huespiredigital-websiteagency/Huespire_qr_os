import React from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, ArrowRight, Users, CircleCheckBig, Zap } from "lucide-react";

// Server Component V2 (Warm Light Redesign)
export default async function QRScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let data = null;
  let errorMsg = null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Use 127.0.0.1 on the server to bypass DNS loopback protection and firewalls
  const fetchUrl = `http://127.0.0.1:5000/qr/validate/${token}`;

  try {
    const res = await fetch(fetchUrl, {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to validate QR code");
    }

    const json = await res.json();
    data = json.data;
  } catch (err: any) {
    errorMsg = err.message || "Invalid QR Code";
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        {/* Soft background glow for error state */}
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(239,68,68,0.03)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 text-center max-w-sm animate-[fadeInUp_0.5s_ease-out_both] bg-white border border-neutral-100 p-8 rounded-3xl shadow-sm">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Invalid QR Code</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-4">{errorMsg}</p>
          <p className="text-xs text-slate-400">Please contact the restaurant staff for assistance.</p>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-slate-800 flex flex-col items-center justify-center p-5 overflow-hidden relative font-sans">
      {/* Animated radial gradient background */}
      <div className="absolute top-[-25%] left-[-25%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_40%,rgba(15,81,50,0.035)_0%,transparent_60%)] pointer-events-none animate-pulse" />

      {/* Secondary subtle glow for depth */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_70%_70%,rgba(15,81,50,0.015)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-[fadeInUp_0.6s_ease-out_both] text-center space-y-6">
        {/* Welcome badge with Sparkles icon */}
        <div className="inline-flex items-center gap-1.5 bg-[#0f5132]/8 border border-[#0f5132]/10 rounded-full px-4.5 py-1.5 text-[10px] font-extrabold text-[#0f5132] tracking-wider uppercase mx-auto">
          <Sparkles className="w-3.5 h-3.5" />
          Welcome Guest
        </div>
        
        {/* Restaurant name */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">You are dining at</p>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {data.restaurantName}
          </h1>
        </div>
        
        {/* Table number card — dramatic display */}
        <div className="bg-white border border-neutral-100 rounded-[24px] p-8 text-center backdrop-blur-xl relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          {/* Inner glow on the card */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(15,81,50,0.015)_0%,transparent_70%)] pointer-events-none" />

          <div className="relative z-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mb-4">
              Your Table
            </div>
            <div className="text-7xl font-black text-[#0f5132] mb-3 leading-none tracking-tight">
              {data.tableNumber}
            </div>
            <div className="text-slate-500 font-semibold text-sm">
              {data.tableName}
            </div>
          </div>
        </div>
        
        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-3.5 h-3.5 text-[#0f5132]/60" />
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Seats</span>
            </div>
            <div className="text-sm font-bold text-slate-700">{data.seatingCapacity} Guests</div>
          </div>
          <div className="bg-white border border-neutral-100 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.01)] text-left">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CircleCheckBig className="w-3.5 h-3.5 text-[#0f5132]/60" />
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Status</span>
            </div>
            <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Active
            </div>
          </div>
        </div>
        
        {/* CTA Button */}
        <div className="pt-2">
          <Link 
            href={`/menu?token=${token}`}
            className="w-full py-4 px-6 bg-[#0f5132] hover:bg-[#0d472c] text-white font-extrabold text-base rounded-2xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 shadow-md shadow-[#0f5132]/10"
          >
            Enter & View Menu
            <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <Zap className="w-3.5 h-3.5 text-[#0f5132]/45" />
          <p className="text-[11px] text-slate-400">
            Powered by <span className="text-[#0f5132] font-bold">Restaurant OS</span>
          </p>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
