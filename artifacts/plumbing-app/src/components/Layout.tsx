import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, CalendarDays, Wrench,
  BriefcaseBusiness, FileText, CreditCard,
  Clock, CheckSquare, PhoneCall, Megaphone, LineChart,
  Menu, X, Package, ClipboardList, Repeat, Droplets,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";

const navGroups = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Work Orders", href: "/bookings", icon: Wrench },
      { name: "Dispatch", href: "/scheduling", icon: CalendarDays },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Technicians", href: "/employees", icon: Users },
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
      { name: "Parts & Supplies", href: "/inventory", icon: Package },
      { name: "POs", href: "/purchase-orders", icon: ClipboardList },
      { name: "Labor", href: "/labor", icon: Clock },
      { name: "To-Dos", href: "/todos", icon: CheckSquare },
      { name: "Campaigns", href: "/campaigns", icon: Megaphone },
      { name: "Reports", href: "/reports", icon: LineChart },
    ],
  },
];

const navItems = navGroups.flatMap(g => g.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex overflow-hidden selection:bg-primary/20">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation — Bottom Sheet */}
      <div className={cn(
        "fixed inset-x-0 bottom-0 z-50 lg:hidden transform transition-transform duration-300 ease-out",
        mobileMenuOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="bg-sidebar rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col border-t border-white/5">
          <div className="flex flex-col items-center pt-3 pb-2 border-b border-white/5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20 mb-3" />
            <div className="flex items-center justify-between w-full px-5 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-white text-base">ProFlow Plumbing</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-1 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-2 px-1">{group.label}</p>
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
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40")} />
                        <span className={cn("text-[11px] font-semibold leading-tight", isActive ? "text-white" : "text-white/60")}>
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Powered by */}
          <div className="px-5 py-3 border-t border-white/5 shrink-0">
            <a href="https://techsavvyhawaii.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-white/25 font-medium">Powered by</span>
              <span className="text-[10px] text-accent/60 font-bold">Tech Savvy Hawaii</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[260px] bg-sidebar flex-col lg:static noise-bg">
        {/* Logo */}
        <div className="p-5 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white leading-none text-[15px] tracking-tight">ProFlow Plumbing</h1>
            <p className="text-[11px] font-medium text-white/30 mt-0.5 tracking-wide">Dashboard</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-1.5 px-3">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13px] transition-all duration-200 group",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                      )}
                    >
                      {isActive && <div className="nav-active-indicator" />}
                      <item.icon className={cn(
                        "w-[18px] h-[18px] transition-all duration-200",
                        isActive ? "text-accent" : "text-white/30 group-hover:text-white/50"
                      )} />
                      <span>{item.name}</span>
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/30" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Powered by */}
        <div className="px-5 py-4 border-t border-white/5">
          <a href="https://techsavvyhawaii.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group">
            <span className="text-[10px] text-white/25 font-medium group-hover:text-white/40 transition-colors">Powered by</span>
            <span className="text-[10px] text-accent/60 font-bold group-hover:text-accent transition-colors">Tech Savvy Hawaii</span>
          </a>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-border/50 h-14 flex items-center px-4 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display font-bold text-foreground text-sm">ProFlow Plumbing</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 rounded-xl text-muted-foreground hover:bg-muted active:scale-95 transition">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex h-14 items-center justify-between px-8 border-b border-border/50 bg-white/60 backdrop-blur-xl sticky top-0 z-30">
          <div />
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-primary/[0.03] to-transparent -z-10 pointer-events-none" />

        <main className="flex-1 overflow-y-auto p-3 md:p-6 lg:p-8 z-0 relative custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, description, action }: { title: string, subtitle?: string, description?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 md:mb-8 animate-fade-in">
    <div>
      <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
      {(subtitle || description) && <p className="mt-1 text-muted-foreground font-medium text-sm">{subtitle || description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
