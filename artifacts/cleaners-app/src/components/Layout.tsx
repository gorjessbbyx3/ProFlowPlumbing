import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarDays, BookOpenCheck,
  BriefcaseBusiness, FileText, CreditCard,
  Clock, CheckSquare, PhoneCall, Megaphone, LineChart,
  Menu, X, Package, ClipboardList, Repeat, Navigation
} from "lucide-react";
import logo from "@assets/Untitled-1_1773440534890.png";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

const navGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Bookings", href: "/bookings", icon: BookOpenCheck },
      { name: "Schedule", href: "/scheduling", icon: CalendarDays },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Employees", href: "/employees", icon: Users },
      { name: "Clients", href: "/clients", icon: BriefcaseBusiness },
      { name: "Follow-ups", href: "/followups", icon: PhoneCall },
    ],
  },
  {
    label: "Finances",
    items: [
      { name: "Invoices", href: "/invoices", icon: FileText },
      { name: "Money", href: "/money", icon: CreditCard },
      { name: "Subscriptions", href: "/subscriptions", icon: Repeat },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Inventory", href: "/inventory", icon: Package },
      { name: "POs", href: "/purchase-orders", icon: ClipboardList },
      { name: "Labor", href: "/labor", icon: Clock },
      { name: "To-Dos", href: "/todos", icon: CheckSquare },
      { name: "Campaigns", href: "/campaigns", icon: Megaphone },
      { name: "Reports", href: "/reports", icon: LineChart },
    ],
  },
];

// Flat list for desktop sidebar
const navItems = navGroups.flatMap(g => g.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden selection:bg-primary/20">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation — Bottom Sheet */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-50 lg:hidden transform transition-transform duration-300 ease-out",
        mobileMenuOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
          {/* Handle + header */}
          <div className="flex flex-col items-center pt-3 pb-2 border-b border-slate-100 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300 mb-3" />
            <div className="flex items-center justify-between w-full px-5 pb-1">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="Logo" className="h-8 w-auto max-w-[100px] object-contain rounded-lg" />
                <span className="font-display font-bold text-primary text-base">808 Cleaners</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable grouped nav */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">{group.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-center transition-all min-h-[68px] active:scale-95",
                          isActive
                            ? "bg-primary text-white shadow-md shadow-primary/25"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                        <span className={cn("text-[11px] font-semibold leading-tight", isActive ? "text-white" : "text-slate-600")}>
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Compact footer */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-3 bg-slate-50/80 shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">L</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 truncate">Lainecaldera@aol.com</p>
              <p className="text-[10px] text-slate-400">808-723-1011</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex-col lg:static">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="All Purpose Cleaners" className="h-12 w-auto max-w-[160px] object-contain rounded-lg shadow-sm" />
            <div>
              <h1 className="font-display font-bold text-primary leading-tight text-lg">All Purpose Cleaners</h1>
              <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Dashboard</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "scale-110" : "group-hover:scale-110 text-slate-400 group-hover:text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 m-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
          <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">Admin Panel</p>
          <p className="text-sm text-slate-600 font-medium truncate">Lainecaldera@aol.com</p>
          <p className="text-xs text-slate-500 mt-0.5">808-723-1011</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 h-14 flex items-center px-4 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Logo" className="h-7 w-auto max-w-[100px] object-contain rounded" />
            <span className="font-display font-bold text-primary text-sm">808 Cleaners</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 rounded-xl text-slate-500 hover:bg-slate-100 active:scale-95 transition">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="absolute top-0 left-0 right-0 h-64 bg-primary/5 -z-10 blur-3xl opacity-50 pointer-events-none" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-0 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, description, action }: { title: string, subtitle?: string, description?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      {(subtitle || description) && <p className="mt-2 text-slate-500 font-medium text-lg">{subtitle || description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
