"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { useAuthStore } from "../../../../lib/store/auth-store";
import { Button } from "../../../../components/ui/button";
import { Modal } from "../../../../components/ui/modal";
import { 
  CreditCard, 
  Users, 
  Check, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight, 
  Info,
  Layers,
  Mail,
  HelpCircle,
  Sparkles
} from "lucide-react";

export default function SubscriptionPage() {
  const user = useAuthStore((state) => state.user);
  const { addToast } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [tablesCount, setTablesCount] = useState(0); // Tables count fallback

  // Upgrade Modal Control
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, staffRes] = await Promise.all([
        apiClient.get("/subscriptions/me"),
        apiClient.get("/plans"),
        apiClient.get("/staff"),
      ]);

      if (subRes.data?.success) setSubscription(subRes.data.data);
      if (plansRes.data) {
        // Sort plans by monthly price
        const sortedPlans = [...plansRes.data].sort((a, b) => 
          Number(a.monthlyPrice) - Number(b.monthlyPrice)
        );
        setPlans(sortedPlans);
      }
      if (staffRes.data?.success) setStaffCount(staffRes.data.data.length);
    } catch (err: any) {
      console.error("Failed to load subscription status:", err);
      addToast(err.response?.data?.message || "Failed to load subscription profiles.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [addToast]);

  const handleOpenUpgrade = (plan: any) => {
    setSelectedPlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!selectedPlan) return;
    try {
      setUpgrading(true);
      const response = await apiClient.post("/subscriptions/upgrade", {
        planId: selectedPlan.id,
      });

      if (response.data?.success) {
        addToast(`Subscription successfully upgraded to ${selectedPlan.name}!`, "success");
        setIsUpgradeModalOpen(false);
        fetchSubscriptionData();
      }
    } catch (err: any) {
      console.error("Upgrade failed:", err);
      addToast(err.response?.data?.message || "Failed to process plan upgrade.", "error");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse pt-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Quota helper
  const renderProgressBar = (label: string, current: number, max: number, icon: React.ReactNode) => {
    const isUnlimited = max >= 999999;
    const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
    const isNearLimit = percentage >= 85 && !isUnlimited;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-2 text-slate-600 font-medium">
            {icon}
            <span>{label}</span>
          </div>
          <span className="font-bold text-slate-800">
            {current} <span className="text-slate-400 font-medium">/ {isUnlimited ? "∞" : max}</span>
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isNearLimit ? "bg-amber-500" : percentage >= 100 ? "bg-red-500" : "bg-indigo-600"
            }`}
            style={{ width: `${isUnlimited ? 5 : percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const currentPlan = subscription?.plan;
  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700 border-green-200",
    TRIAL: "bg-blue-50 text-blue-700 border-blue-200",
    EXPIRED: "bg-red-50 text-red-700 border-red-200",
    SUSPENDED: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className="space-y-8">
      {/* Current Subscription overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Current Plan Package</span>
                <div className="flex items-center space-x-2">
                  <h3 className="text-2xl font-extrabold text-slate-900">{currentPlan?.name || "No Plan"}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[subscription?.status] || "bg-slate-50 text-slate-600"}`}>
                    {subscription?.status || "INACTIVE"}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-2xl font-black text-slate-900">
                  ₹{Number(subscription?.monthlyPrice || 0).toLocaleString("en-IN")}
                  <span className="text-sm font-medium text-slate-500"> / month</span>
                </p>
                {Number(subscription?.setupFee) > 0 && (
                  <p className="text-xs text-slate-400">
                    + ₹{Number(subscription.setupFee).toLocaleString("en-IN")} setup fee
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-500">
              {currentPlan?.description || "Basic access to restaurant workspace operations."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
              <div className="flex items-center space-x-3 text-slate-600">
                <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Renewal Date</p>
                  <p className="font-medium text-slate-800">
                    {subscription?.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    }) : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-slate-600">
                <CreditCard className="h-5 w-5 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Billing Cycle</p>
                  <p className="font-medium text-slate-800 capitalize">
                    {subscription?.billingCycle?.toLowerCase() || "monthly"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4">
            <Info className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <span>
              Your subscription is set to {subscription?.isAutoRenew ? "auto-renew" : "expire"} on the billing date.
            </span>
          </div>
        </div>

        {/* Quota Progress indicators */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Quota & Usage Metrics
          </h4>
          <div className="space-y-4">
            {renderProgressBar(
              "Staff Members", 
              staffCount, 
              subscription?.maxStaff || 0,
              <Users className="h-4 w-4" />
            )}
            {renderProgressBar(
              "Table Quota", 
              tablesCount, 
              subscription?.maxTables || 0,
              <Layers className="h-4 w-4" />
            )}
            {renderProgressBar(
              "Monthly Emails", 
              subscription?.currentEmailUsage || 0, 
              subscription?.monthlyEmailLimit || 0,
              <Mail className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Plans Upgrade Comparison Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
            <Sparkles className="h-3 w-3" />
            <span>Pricing Packages</span>
          </span>
          <h3 className="text-2xl font-black text-slate-900">Upgrade Your Workspace</h3>
          <p className="text-sm text-slate-500">
            Unlock additional staff capacities, tables, and custom integrations to grow your restaurant business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id;
            const price = Number(plan.monthlyPrice);
            const isEnterprise = plan.code === "ENTERPRISE";

            return (
              <div 
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  isCurrent 
                    ? "border-indigo-600 ring-2 ring-indigo-600/10" 
                    : "border-slate-200"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Current Plan
                  </span>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-950">{plan.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>
                  </div>

                  <div className="border-t border-b border-slate-100 py-4">
                    <p className="text-3xl font-black text-slate-950">
                      ₹{price.toLocaleString("en-IN")}
                      <span className="text-xs font-medium text-slate-400"> / mo</span>
                    </p>
                    {Number(plan.setupFee) > 0 ? (
                      <p className="text-[10px] text-slate-400 mt-1">
                        + ₹{Number(plan.setupFee).toLocaleString("en-IN")} setup fee
                      </p>
                    ) : (
                      <p className="text-[10px] text-green-600 font-semibold mt-1">
                        Free onboarding setup
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 text-xs">
                    <li className="flex items-center space-x-2 text-slate-700">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        Staff Accounts: <strong className="text-slate-900">{plan.maxStaff >= 999999 ? "Unlimited" : plan.maxStaff}</strong>
                      </span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-700">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        Tables: <strong className="text-slate-900">{plan.maxTables >= 999999 ? "Unlimited" : plan.maxTables}</strong>
                      </span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-700">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>
                        Emails: <strong className="text-slate-900">{plan.monthlyEmailLimit} / mo</strong>
                      </span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-700">
                      {plan.customDomain ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">×</span>
                      )}
                      <span className={plan.customDomain ? "text-slate-700" : "text-slate-400 line-through"}>
                        Custom Subdomains & Domain Map
                      </span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-700">
                      {plan.analyticsEnabled ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">×</span>
                      )}
                      <span className={plan.analyticsEnabled ? "text-slate-700" : "text-slate-400 line-through"}>
                        Detailed Analytics & Reports
                      </span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-700">
                      {plan.prioritySupport ? (
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold flex-shrink-0">×</span>
                      )}
                      <span className={plan.prioritySupport ? "text-slate-700" : "text-slate-400 line-through"}>
                        24/7 Priority VIP Support
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  {isCurrent ? (
                    <Button disabled className="w-full justify-center">
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleOpenUpgrade(plan)}
                      variant="primary"
                      className="w-full justify-center cursor-pointer"
                    >
                      Upgrade Plan
                      <ArrowUpRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upgrade Confirmation Modal */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Confirm Plan Upgrade"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900">
            <AlertCircle className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold">Subscription Upgrade terms</h4>
              <p className="mt-1 text-indigo-700">
                Upgrading package structures changes staff and table limit quotas immediately. Existing configurations are maintained intact.
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Are you sure you want to upgrade your restaurant subscription to the{" "}
            <span className="font-semibold text-slate-900">"{selectedPlan?.name}"</span> package? 
            This will charge <span className="font-semibold text-slate-950">₹{Number(selectedPlan?.monthlyPrice || 0).toLocaleString("en-IN")}/month</span>.
          </p>
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsUpgradeModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={upgrading} onClick={handleUpgradeConfirm} className="px-5">
              Confirm & Upgrade
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
