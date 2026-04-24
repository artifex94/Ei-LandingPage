import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', children, isLoading, loadingText, disabled, variant = 'primary', ...props }, ref) => {
    const base = `
      relative inline-flex w-full items-center justify-center gap-2
      font-bold tracking-widest uppercase text-sm select-none
      rounded-sm px-8 py-4 min-h-[52px]
      transition-all duration-150 ease-mech-press
      disabled:opacity-50 disabled:cursor-not-allowed
      disabled:border-b-[5px] disabled:translate-y-0
    `;

    const variants = {
      primary: `
        bg-tactical-500 text-white
        border border-tactical-600
        border-b-[5px] border-b-tactical-600
        shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]
        hover:bg-tactical-400
        active:border-b-[1px] active:translate-y-[4px]
        active:bg-tactical-600
      `,
      secondary: `
        bg-industrial-700 text-slate-300
        border border-industrial-600
        border-b-[5px] border-b-industrial-950
        shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]
        hover:bg-industrial-600 hover:text-slate-200
        active:border-b-[1px] active:translate-y-[4px]
      `,
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || disabled}
        aria-busy={isLoading}
        aria-label={isLoading ? (loadingText ?? 'Procesando...') : undefined}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-current opacity-80"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{loadingText ?? 'Procesando...'}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
