import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

export const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground rounded-2xl border border-border/60 shadow-lg shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-border",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive", isLoading?: boolean }
>(({ className, variant = "primary", isLoading, children, disabled, ...props }, ref) => {
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-border bg-transparent hover:bg-slate-50 text-foreground",
    ghost: "bg-transparent hover:bg-slate-100 text-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex w-full rounded-xl border-2 border-border bg-slate-50/50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground text-foreground",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex w-full rounded-xl border-2 border-border bg-slate-50/50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground appearance-none",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export const FormField = ({ label, name, type = "text", required = false, defaultValue = "", options = [], className = "" }: { label: string, name: string, type?: string, required?: boolean, defaultValue?: string, options?: {label: string, value: string}[], className?: string }) => (
  <div className={cn("space-y-2", className)}>
    <Label htmlFor={name}>{label} {required && <span className="text-destructive">*</span>}</Label>
    {type === "select" ? (
      <Select name={name} id={name} required={required} defaultValue={defaultValue}>
        <option value="" disabled>Select {label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    ) : type === "textarea" ? (
      <textarea
        name={name}
        id={name}
        required={required}
        defaultValue={defaultValue}
        className="flex w-full rounded-xl border-2 border-border bg-slate-50/50 px-4 py-2.5 text-sm transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary placeholder:text-muted-foreground text-foreground min-h-[100px] resize-y"
      />
    ) : (
      <Input type={type} name={name} id={name} required={required} defaultValue={defaultValue} step={type === "number" ? "0.01" : undefined} />
    )}
  </div>
);

export const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border", className)}>
    {children}
  </span>
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-3xl shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 shrink-0">
          <h2 className="text-xl font-bold font-display">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
