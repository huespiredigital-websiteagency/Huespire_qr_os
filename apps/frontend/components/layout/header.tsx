import React from "react";
import { Menu, User, LogOut } from "lucide-react";
import { useAuthStore } from "../../lib/store/auth-store";
import { useUIStore } from "../../lib/store/ui-store";

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = "Dashboard" }) => {
  const { user, logout } = useAuthStore();
  const { setMobileSidebarOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      {/* Left section: mobile toggle & page title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus:outline-none md:hidden cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 capitalize tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right section: user actions */}
      <div className="flex items-center space-x-4">
        {/* User Info Display */}
        <div className="flex items-center space-x-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-slate-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-500 font-medium capitalize">
              {user?.role.toLowerCase().replace("_", " ")}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
            {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
          </div>
        </div>
      </div>
    </header>
  );
};
