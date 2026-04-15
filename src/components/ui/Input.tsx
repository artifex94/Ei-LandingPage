import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg bg-slate-700 border text-white placeholder:text-slate-400 outline-none transition-all";
    const errorClasses = error
      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-slate-600 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

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