import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number | null | undefined) {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (["completed", "paid", "active", "converted"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (["scheduled", "planned", "pending"].includes(s)) return "bg-blue-100 text-blue-800 border-blue-200";
  if (["in progress", "contacted"].includes(s)) return "bg-amber-100 text-amber-800 border-amber-200";
  if (["cancelled", "lost", "unpaid"].includes(s)) return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}
