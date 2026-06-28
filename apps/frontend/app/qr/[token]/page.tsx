import React from "react";
import Link from "next/link";

// Server Component
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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold text-red-500 mb-2">Invalid QR Code</h1>
          <p className="text-neutral-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.1)_0%,transparent_60%)] pointer-events-none animate-pulse"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 text-xs font-semibold text-amber-500 mb-6 tracking-wide uppercase">
          ✦ Welcome
        </div>
        
        <h1 className="text-3xl font-extrabold mb-1 text-white">
          {data.restaurantName}
        </h1>
        <p className="text-neutral-500 mb-8">📍 {data.branchName}</p>
        
        <div className="bg-white/5 border border-amber-500/20 rounded-3xl p-8 text-center mb-6 backdrop-blur-md">
          <div className="text-xs font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">
            Your Table
          </div>
          <div className="text-7xl font-black text-white mb-2 leading-none">
            {data.tableNumber}
          </div>
          <div className="text-neutral-400 font-medium">
            {data.tableName}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Seats</div>
            <div className="text-base font-semibold text-neutral-200">{data.seatingCapacity} Guests</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Status</div>
            <div className="text-base font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Active
            </div>
          </div>
        </div>
        
        <Link 
          href={`/menu?token=${token}`}
          className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
        >
          View Menu
          <span>→</span>
        </Link>
        
        <p className="text-center text-xs text-neutral-600 mt-8">
          Powered by <span className="text-amber-500 font-semibold">Huespire</span>
        </p>
      </div>
    </div>
  );
}
