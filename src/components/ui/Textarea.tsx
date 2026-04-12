import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg bg-slate-50 border outline-none transition-all resize-none";
    const errorClasses = error
      ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
      : "border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

    return (
      <div className="w-full">
        <textarea ref={ref} className={`${baseClasses} ${errorClasses} ${className}`} {...props} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;