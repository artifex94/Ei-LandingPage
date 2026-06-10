import React, { useId } from "react";
import { cn } from "@/lib/ui/cn";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-300 mb-1.5", className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  /**
   * Render-prop que recibe los ids/aria a aplicar al control. Permite usar
   * `Input`/`Select`/`Textarea` existentes sin acoplarlos.
   */
  children: (field: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

/**
 * Compone Label + control + (hint|error) con vínculos a11y correctos
 * (`htmlFor`, `aria-describedby`, `aria-invalid`) (RF-A4).
 */
export function FormField({
  label,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("w-full", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-red-400 text-xs mt-1">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-slate-500 text-xs mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default FormField;
