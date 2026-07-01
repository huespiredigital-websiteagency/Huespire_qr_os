"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Banknote,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  CreditCard,
  QrCode,
  User,
  Receipt,
  Printer
} from "lucide-react";
import { Button } from "../../../../components/ui/button";

export default function PaymentAuditPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [reportsData, setReportsData] = useState<{
    totalRevenue: number;
    count: number;
    payments: any[];
  }>({
    totalRevenue: 0,
    count: 0,
    payments: []
  });

  // Filters state
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (paymentMethod) params.append("paymentMethod", paymentMethod);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await apiClient.get(`/billing/payments/reports?${params.toString()}`);
      if (response.data?.success) {
        setReportsData(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to load payment audit reports.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [paymentMethod, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Banknote className="h-6 w-6 mr-2 text-emerald-400" />
            Payment History & Audit Reports
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track physical payment collections, audit cashier logs, and filter revenue history.
          </p>
        </div>
        <Button
          onClick={fetchReports}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          Refresh Audit
        </Button>
      </div>

      {/* Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-neutral-850 border border-slate-800 p-6 rounded-3xl space-y-2 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtered Revenue</span>
            <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
              ${reportsData.totalRevenue.toFixed(2)}
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-6 rounded-3xl space-y-2 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paid Bills</span>
            <div className="text-3xl font-black text-indigo-400 font-mono mt-1">
              {reportsData.count}
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-6 rounded-3xl space-y-2 flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Bill</span>
            <div className="text-3xl font-black text-white font-mono mt-1">
              ${reportsData.count > 0 ? (reportsData.totalRevenue / reportsData.count).toFixed(2) : "0.00"}
            </div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Banknote className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900/40 p-5 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-indigo-400" />
          <span>Audit Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-neutral-850 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Methods (Cash, UPI, Card, Other)</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI QR</option>
              <option value="CARD">Card POS</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-850 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-850 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Data Table */}
      <div className="bg-neutral-850 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <p className="text-xs font-semibold">Fetching audit records...</p>
          </div>
        ) : reportsData.payments.length === 0 ? (
          <div className="p-12 text-center space-y-2 text-slate-500">
            <Banknote className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-white">No payment audit logs match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="p-4">Bill #</th>
                  <th className="p-4">Table</th>
                  <th className="p-4">Session #</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Cashier</th>
                  <th className="p-4">Paid Timestamp</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {reportsData.payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-bold text-indigo-400">{pay.billNumber}</td>
                    <td className="p-4 font-bold text-white">Table {pay.tableNumber}</td>
                    <td className="p-4 font-mono text-slate-400">#{pay.sessionNumber.slice(-6)}</td>
                    <td className="p-4 font-semibold">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-mono ${
                        pay.paymentMethod === "CASH"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : pay.paymentMethod === "UPI"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {pay.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 flex items-center space-x-2">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>{pay.cashierName}</span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(pay.paidAt).toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ${pay.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
