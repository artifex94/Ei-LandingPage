import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg bg-slate-50 border outline-none transition-all";
    const errorClasses = error
      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

    return (
      <div className="w-full">
        <input ref={ref} className={`${baseClasses} ${errorClasses} ${className}`} {...props} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;