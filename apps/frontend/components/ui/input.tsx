import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-sm font-semibold text-slate-800">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          <input
            ref={ref}
            type={type}
            className={twMerge(
              clsx(
                "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 text-slate-900 bg-white placeholder:text-slate-500 font-medium",
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              ),
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-red-600 font-semibold">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-600 font-medium">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
