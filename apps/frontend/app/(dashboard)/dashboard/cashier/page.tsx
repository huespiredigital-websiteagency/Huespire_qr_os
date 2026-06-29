"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import {
  Search,
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Clock,
  Printer,
  X,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ChevronRight,
  Utensils
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { getSocket } from "../../../../lib/socket";

export default function CashierDashboardPage() {
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ready" | "open" | "active" | "paid">("ready");

  // Data state
  const [sessionsData, setSessionsData] = useState<{
    activeSessions: any[];
    openBills: any[];
    readyForPayment: any[];
    paidBills: any[];
    closedBills: any[];
  }>({
    activeSessions: [],
    openBills: [],
    readyForPayment: [],
    paidBills: [],
    closedBills: []
  });

  // Modal / Billing state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [billData, setBillData] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState<boolean>(false);

  // Payment execution state
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);

  // Receipt modal state
  const [receiptPayload, setReceiptPayload] = useState<any>(null);

  const fetchCashierSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/billing/cashier/sessions${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      if (response.data?.success) {
        setSessionsData(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to load cashier sessions.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashierSessions();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchCashierSessions();
    };

    socket.on("order.served", handleUpdate);
    socket.on("bill.updated", handleUpdate);
    socket.on("payment.completed", handleUpdate);
    socket.on("session.closed", handleUpdate);

    return () => {
      socket.off("order.served", handleUpdate);
      socket.off("bill.updated", handleUpdate);
      socket.off("payment.completed", handleUpdate);
      socket.off("session.closed", handleUpdate);
    };
  }, [search]);

  const handleOpenBillModal = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setPaymentMethod("CASH");
    setAmountReceived("");
    setNotes("");
    setBillData(null);

    try {
      setLoadingBill(true);
      const response = await apiClient.get(`/billing/bills/session/${sessionId}`);
      if (response.data?.success) {
        const data = response.data.data;
        setBillData(data);
        setAmountReceived(String(data.financials.grandTotal));
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Failed to generate bill.", "error");
      setSelectedSessionId(null);
    } finally {
      setLoadingBill(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedSessionId || !billData) return;

    const grandTotal = billData.financials.grandTotal;
    const recNum = parseFloat(amountReceived);

    if (paymentMethod === "CASH") {
      if (isNaN(recNum) || recNum < grandTotal) {
        addToast(`Received amount ($${recNum || 0}) cannot be less than grand total ($${grandTotal}).`, "error");
        return;
      }
    }

    try {
      setProcessingPayment(true);
      const response = await apiClient.post("/billing/payments/confirm", {
        sessionId: selectedSessionId,
        paymentMethod,
        amountReceived: paymentMethod === "CASH" ? recNum : grandTotal,
        notes: notes || undefined
      });

      if (response.data?.success) {
        const paymentId = response.data.data.paymentId;
        addToast("Payment confirmed and table session closed!", "success");
        setSelectedSessionId(null);
        fetchCashierSessions();
        // Fetch receipt payload for printing
        handleFetchReceipt(paymentId);
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.response?.data?.message || "Payment confirmation failed.", "error");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFetchReceipt = async (paymentId: string) => {
    try {
      const response = await apiClient.get(`/billing/payments/receipt/${paymentId}`);
      if (response.data?.success) {
        setReceiptPayload(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      addToast("Failed to fetch printable receipt.", "error");
    }
  };

  const currentTabSessions = () => {
    switch (activeTab) {
      case "ready":
        return sessionsData.readyForPayment;
      case "open":
        return sessionsData.openBills;
      case "active":
        return sessionsData.activeSessions;
      case "paid":
        return sessionsData.paidBills;
      default:
        return sessionsData.readyForPayment;
    }
  };

  const calcChange = () => {
    if (!billData) return 0;
    const rec = parseFloat(amountReceived);
    if (isNaN(rec)) return 0;
    return Math.max(0, rec - billData.financials.grandTotal);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Receipt className="h-6 w-6 mr-2 text-indigo-400" />
            Cashier Billing Dashboard
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage active table bills, confirm physical payments (Cash, UPI, Card), and generate customer receipts.
          </p>
        </div>
        <Button
          onClick={fetchCashierSessions}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 py-2.5 px-4 rounded-xl cursor-pointer flex items-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh Live Sessions
        </Button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ready for Payment</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{sessionsData.readyForPayment.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Open Bills</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{sessionsData.openBills.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Dining</span>
            <div className="text-2xl font-bold text-indigo-400 mt-1">{sessionsData.activeSessions.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Utensils className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-neutral-850 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Paid & Closed</span>
            <div className="text-2xl font-bold text-slate-300 mt-1">{sessionsData.paidBills.length}</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-700/30 text-slate-300 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Table #, Session #, or Bill #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-850 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-neutral-850 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {[
            { id: "ready", label: `Ready for Payment (${sessionsData.readyForPayment.length})` },
            { id: "open", label: `Open Bills (${sessionsData.openBills.length})` },
            { id: "active", label: `All Active (${sessionsData.activeSessions.length})` },
            { id: "paid", label: `Paid (${sessionsData.paidBills.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mr-3 text-indigo-400" />
          <span>Loading cashier sessions...</span>
        </div>
      ) : currentTabSessions().length === 0 ? (
        <div className="bg-neutral-850/40 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <Receipt className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-md font-bold text-white">No sessions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no dining sessions matching this category or search criteria right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentTabSessions().map((sess) => (
            <div
              key={sess.id}
              className="bg-neutral-850 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 flex flex-col justify-between transition-all shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center">
                      T-{sess.table.tableNumber}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Table {sess.table.tableNumber}</h4>
                      <p className="text-[10px] text-slate-500">Session #{sess.sessionNumber.slice(-6)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    sess.status === "CLOSED"
                      ? "bg-slate-800 text-slate-400"
                      : sess.hasUnservedOrders
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {sess.status === "CLOSED" ? "Closed" : sess.hasUnservedOrders ? "Orders Preparing" : "Ready to Pay"}
                  </span>
                </div>

                {/* Orders Overview */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Orders:</span>
                    <span className="font-semibold text-white">{sess.ordersCount}</span>
                  </div>
                  {sess.latestBill && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bill Number:</span>
                      <span className="font-mono text-indigo-400 font-semibold">{sess.latestBill.billNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-sm">
                    <span className="font-bold text-slate-300">Grand Total:</span>
                    <span className="font-bold text-emerald-400">${sess.summary.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {sess.status !== "CLOSED" ? (
                <Button
                  onClick={() => handleOpenBillModal(sess.id)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl border-none cursor-pointer flex items-center justify-center shadow-md"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Open Bill & Collect Payment
                </Button>
              ) : (
                <div className="text-center text-xs text-slate-500 py-2 font-medium">
                  Paid & Session Closed
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bill Viewing & Manual Payment Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-950 p-6 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Receipt className="h-5 w-5 mr-2 text-indigo-400" />
                  Table Checkout & Bill Confirmation
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Review itemized bill and select physical payment method.</p>
              </div>
              <button
                onClick={() => setSelectedSessionId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {loadingBill || !billData ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-400" />
                <p className="text-sm font-semibold">Consolidating session orders and calculating totals...</p>
              </div>
            ) : (
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Bill Metadata Banner */}
                <div className="grid grid-cols-3 gap-3 bg-neutral-850 p-4 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Table</span>
                    <p className="text-sm font-bold text-white mt-0.5">Table {billData.table.tableNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Bill Number</span>
                    <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">{billData.bill.billNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Session</span>
                    <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">#{billData.session.sessionNumber.slice(-6)}</p>
                  </div>
                </div>

                {/* Itemized Order Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itemized Orders</h4>
                  <div className="border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-neutral-850 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="p-3">Item</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Price</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {billData.itemizedList.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/40">
                            <td className="p-3">
                              <div className="font-bold text-white">{item.itemName}</div>
                              {item.variants.length > 0 && (
                                <div className="text-[10px] text-indigo-400">Variant: {item.variants.map((v: any) => v.name).join(", ")}</div>
                              )}
                              {item.addons.length > 0 && (
                                <div className="text-[10px] text-emerald-400">Addons: {item.addons.map((a: any) => a.name).join(", ")}</div>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-white">{item.quantity}</td>
                            <td className="p-3 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-emerald-400 font-mono">${item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Totals Summary */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">${billData.financials.subtotal.toFixed(2)}</span>
                  </div>
                  {billData.financials.discountAmount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Discount:</span>
                      <span className="font-mono">-${billData.financials.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({billData.financials.taxPercentage}%):</span>
                    <span className="font-mono text-white">${billData.financials.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-emerald-400 pt-2 border-t border-slate-800">
                    <span>Grand Total:</span>
                    <span className="font-mono">${billData.financials.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Manual Payment Method Selection */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Method (Physical Collection)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: "CASH", label: "Cash", icon: Banknote },
                      { id: "UPI", label: "UPI QR", icon: QrCode },
                      { id: "CARD", label: "Card POS", icon: CreditCard },
                      { id: "OTHER", label: "Other", icon: DollarSign }
                    ].map((m) => {
                      const IconComponent = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(m.id as any);
                            if (m.id !== "CASH") setAmountReceived(String(billData.financials.grandTotal));
                          }}
                          className={`p-3 rounded-2xl border text-center font-semibold text-xs flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                            paymentMethod === m.id
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                              : "bg-neutral-850 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          <IconComponent className="h-5 w-5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash Calculation Inputs */}
                {paymentMethod === "CASH" && (
                  <div className="bg-neutral-850 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-xs font-bold text-white">Amount Received ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white text-sm font-bold font-mono rounded-xl px-3 py-2 w-full sm:w-48 text-right focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
                      <span className="text-slate-400 font-medium">Balance / Change to Return:</span>
                      <span className="text-base font-bold text-amber-400 font-mono">${calcChange().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    onClick={() => setSelectedSessionId(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-white border-none py-3 px-5 rounded-xl cursor-pointer font-semibold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmPayment}
                    disabled={processingPayment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl border-none cursor-pointer flex items-center shadow-lg text-xs"
                  >
                    {processingPayment ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Confirming Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Payment & Close Table
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 my-8">
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
              <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">{receiptPayload.restaurant.name}</h3>
              <p className="text-xs text-slate-600">{receiptPayload.restaurant.address}</p>
              <p className="text-xs text-slate-600">Ph: {receiptPayload.restaurant.phone}</p>
            </div>

            <div className="grid grid-cols-2 text-xs text-slate-700 gap-1 font-mono">
              <div>Bill #: <strong>{receiptPayload.billNumber}</strong></div>
              <div className="text-right">Table #: <strong>{receiptPayload.tableNumber}</strong></div>
              <div>Session #: <strong>{receiptPayload.sessionNumber.slice(-6)}</strong></div>
              <div className="text-right">Date: <strong>{new Date(receiptPayload.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
              <div className="col-span-2 pt-1">Cashier: <strong>{receiptPayload.cashierName}</strong></div>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold text-slate-900 uppercase">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amount</span>
              </div>
              {receiptPayload.items.map((it: any, i: number) => (
                <div key={i} className="grid grid-cols-12 text-xs text-slate-800 font-mono items-start">
                  <div className="col-span-6">
                    <div>{it.name}</div>
                    {it.variants.length > 0 && <div className="text-[10px] text-slate-500">({it.variants.join(", ")})</div>}
                  </div>
                  <span className="col-span-2 text-center font-bold">{it.quantity}</span>
                  <span className="col-span-4 text-right">${it.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs font-mono text-slate-800">
              <div className="flex justify-between"><span>Subtotal:</span><span>${receiptPayload.financials.subtotal.toFixed(2)}</span></div>
              {receiptPayload.financials.discount > 0 && (
                <div className="flex justify-between text-amber-700"><span>Discount:</span><span>-${receiptPayload.financials.discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span>Tax:</span><span>${receiptPayload.financials.tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-900 pt-2 mt-2">
                <span>TOTAL PAID:</span>
                <span>${receiptPayload.financials.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>Payment Method:</span>
                <span className="font-bold">{receiptPayload.paymentMethod}</span>
              </div>
              {receiptPayload.paymentMethod === "CASH" && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-600"><span>Received:</span><span>${receiptPayload.financials.amountReceived.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[11px] text-slate-600"><span>Change Returned:</span><span>${receiptPayload.financials.changeGiven.toFixed(2)}</span></div>
                </>
              )}
            </div>

            <div className="text-center pt-4 border-t border-dashed border-slate-300 text-xs italic text-slate-600">
              {receiptPayload.restaurant.footer}
            </div>

            <div className="flex justify-end space-x-3 pt-2 no-print">
              <Button
                onClick={() => setReceiptPayload(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 border-none py-2 px-4 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl border-none cursor-pointer flex items-center text-xs shadow-md"
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
