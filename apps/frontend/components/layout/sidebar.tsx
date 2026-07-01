import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "../../lib/store/auth-store";
import { useUIStore } from "../../lib/store/ui-store";
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  Settings,
  User,
  Shield,
  LogOut,
  X,
  Menu,
  Table,
  QrCode,
  Utensils,
  List,
  Layers,
  PlusCircle,
  Upload,
  Receipt,
  Banknote,
  Flame,
  ChefHat
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  const role = user?.role || "STAFF";

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "KITCHEN", "CASHIER"],
    },
    {
      name: "Kitchen Display",
      href: "/dashboard/kitchen",
      icon: Flame,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "KITCHEN"],
    },
    {
      name: "Waiter Display",
      href: "/dashboard/waiter",
      icon: ChefHat,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER"],
    },
    {
      name: "Cashier Billing",
      href: "/dashboard/cashier",
      icon: Receipt,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"],
    },
    {
      name: "Payment Audit",
      href: "/dashboard/payments",
      icon: Banknote,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"],
    },
    {
      name: "Restaurant",
      href: "/dashboard/settings", // Redirects or displays settings
      icon: Store,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Tables",
      href: "/dashboard/tables",
      icon: Table,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "CASHIER"],
    },
    {
      name: "QR Codes",
      href: "/dashboard/qr",
      icon: QrCode,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "CASHIER"],
    },
    {
      name: "Menu Items",
      href: "/dashboard/menu/items",
      icon: Utensils,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER"],
    },
    {
      name: "Categories",
      href: "/dashboard/menu/categories",
      icon: Layers,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Variants",
      href: "/dashboard/menu/variants",
      icon: List,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Add-ons",
      href: "/dashboard/menu/addons",
      icon: PlusCircle,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Bulk Import",
      href: "/dashboard/menu/import",
      icon: Upload,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Staff",
      href: "/dashboard/staff",
      icon: Users,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
    },
    {
      name: "Subscription",
      href: "/dashboard/subscription",
      icon: CreditCard,
      roles: ["SUPER_ADMIN", "OWNER"],
    },
    {
      name: "Plans",
      href: "/dashboard/plans",
      icon: Shield,
      roles: ["SUPER_ADMIN"],
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: User,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "KITCHEN", "CASHIER"],
    },
    {
      name: "Roles",
      href: "/dashboard/roles",
      icon: Shield,
      roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "WAITER", "KITCHEN", "CASHIER"],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(role)
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand logo */}
      <div className="flex items-center justify-between h-16 px-6 bg-slate-950 text-white border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">
            Restaurant <span className="text-indigo-500">OS</span>
          </span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden p-1 rounded-lg hover:bg-slate-800 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20"
                  : "text-slate-300 font-medium hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0">
              {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize font-medium">
                {user?.role.toLowerCase().replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-red-400 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-800">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible only when open) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 transition-transform duration-300 transform">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
