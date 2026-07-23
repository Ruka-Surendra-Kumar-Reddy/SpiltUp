"use client";

import { useEffect, type ReactNode } from "react";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "danger" | "warning" | "ghost" | "outline";
export function Btn({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.98] px-4 py-2.5 text-sm";
  const variants: Record<BtnVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    danger: "bg-danger text-danger-foreground hover:bg-danger/90 shadow-sm shadow-danger/20",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
    outline: "border border-border text-foreground hover:bg-secondary/60 hover:border-primary/40",
  };
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- Field ---------------- */
export function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl bg-background/60 border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors";

export function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className || ""}`} />;
}

export function Txt(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} resize-none ${props.className || ""}`} />;
}

export function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputBase} appearance-none bg-no-repeat pr-9 ${props.className || ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238da3c0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.75rem center",
        ...props.style,
      }}
    />
  );
}

/* ---------------- Badge ---------------- */
type BadgeTone = "primary" | "warning" | "danger" | "muted" | "info";
export function Badge({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    primary: "bg-primary/15 text-primary border-primary/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    muted: "bg-secondary text-muted-foreground border-border",
    info: "bg-sky-400/15 text-sky-300 border-sky-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`spl-scale-in w-full ${sizes[size]} max-h-[92vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 flex flex-col`}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          {icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-lg">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-semibold leading-tight">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="spl-scroll overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function Empty({ icon, title, message, action }: { icon: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary/60 text-2xl text-muted-foreground">
        <i className={icon} />
      </div>
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {message && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Logo ---------------- */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "h-9 w-9", icon: "text-base", text: "text-lg" },
    md: { box: "h-11 w-11", icon: "text-xl", text: "text-2xl" },
    lg: { box: "h-20 w-20", icon: "text-3xl", text: "text-4xl" },
  };
  const s = sizes[size];
  return (
    <div className="flex items-center gap-3">
      <div className={`relative grid ${s.box} place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground shadow-lg shadow-primary/30`}>
        <i className={`fa-solid fa-arrow-right-arrow-left ${s.icon}`} />
      </div>
      <span className={`font-heading ${s.text} font-bold tracking-tight`}>
        Spliit<span className="text-primary">Up</span>
      </span>
    </div>
  );
}
