import React, { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, ...props }, ref) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg bg-slate-700 border outline-none transition-all text-white";
    const errorClasses = error
      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-slate-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

    return (
      <div className="w-full">
        <select ref={ref} className={`${baseClasses} ${errorClasses} ${className}`} {...props}>
          {children}
        </select>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
export default Select;