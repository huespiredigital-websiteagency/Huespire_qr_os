"use client";

import React, { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCustomerStore } from "../../../../lib/store/customer-store";
import { Loader2 } from "lucide-react";

export default function MenuTokenPage() {
  const router = useRouter();
  const params = useParams();
  const setToken = useCustomerStore((state) => state.setToken);

  const token = params?.token as string;

  useEffect(() => {
    if (token) {
      setToken(token);
      router.replace("/menu");
    }
  }, [token, setToken, router]);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
      <Loader2 className="w-8 h-8 text-[#0f5132] animate-spin" />
    </div>
  );
}
