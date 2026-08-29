import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "warning" | "success";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm",
        variant === "default" && "border-border bg-card text-foreground",
        variant === "destructive" &&
          "border-destructive/50 bg-destructive/10 text-destructive",
        variant === "warning" &&
          "border-primary/40 bg-primary/10 text-foreground",
        variant === "success" &&
          "border-success/40 bg-success/10 text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" &&
          "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" &&
          "border-transparent bg-muted text-muted-foreground",
        variant === "outline" && "text-foreground",
        variant === "success" &&
          "border-transparent bg-success/15 text-success",
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-primary",
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Checkbox({
  className,
  checked,
  onCheckedChange,
  id,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "h-4 w-4 rounded border-input text-primary focus:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}
