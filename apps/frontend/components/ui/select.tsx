import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          <select
            ref={ref}
            className={twMerge(
              clsx(
                "block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-1 text-slate-900 bg-white cursor-pointer",
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500 text-red-900"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              ),
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
