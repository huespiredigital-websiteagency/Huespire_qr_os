"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../../../../lib/api-client";
import { useUIStore } from "../../../../lib/store/ui-store";
import { Shield, Check, Info, ShieldCheck } from "lucide-react";

export default function RolesPage() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/roles");
        if (res.data?.success && res.data.data) {
          // Sort by display order
          const sortedRoles = [...res.data.data].sort((a, b) => 
            (a.displayOrder || 0) - (b.displayOrder || 0)
          );
          setRoles(sortedRoles);
        }
      } catch (err) {
        console.error("Failed to fetch system roles:", err);
        addToast("Failed to retrieve system roles configuration.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [addToast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const rolePermissionsMap: Record<string, string[]> = {
    SUPER_ADMIN: ["Platform Plans Configure", "System Metrics Audit", "Super Administrator Override", "Role Permission Audits"],
    OWNER: ["Complete Store Control", "Billing & Subscription Upgrade", "Staff Invite & Revocation", "Restaurant Settings Profile"],
    MANAGER: ["Staff Info Adjustments", "Menu & Categories Access", "Table Status Modifications", "Orders Tracking"],
    WAITER: ["Table Seat Assignment", "Orders Creating", "Menu Checking", "Order Status View"],
    KITCHEN: ["Menu Status Toggling", "Preparing Orders Status", "Orders Cooking Queue"],
    CASHIER: ["Payments Processing", "Receipts Generating", "Orders Settlements"],
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-start space-x-3 text-slate-700 max-w-2xl">
        <Info className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500">
          Operational roles are pre-configured core system-wide capabilities (RBAC). 
          They are read-only and enforce secure backend route access checks according to restaurant workspace policy.
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Shield className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-900">No Operational Roles</h3>
            <p className="text-sm text-slate-500">No system roles configurations found on the server.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const permissions = rolePermissionsMap[role.code] || ["Base operational access"];
            const isSuperAdminRole = role.code === "SUPER_ADMIN";

            return (
              <div 
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                        <span>{role.name}</span>
                        {role.isSystem && (
                          <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded tracking-wide flex items-center space-x-0.5">
                            <ShieldCheck className="h-3 w-3 text-indigo-500" />
                            <span>System</span>
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 w-max uppercase tracking-wider font-semibold">
                        {role.code}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                    {role.description || "Pre-defined role for workspace operations."}
                  </p>

                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Permissions Clearance</span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
                      {permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-center space-x-1.5">
                          <Check className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{perm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
