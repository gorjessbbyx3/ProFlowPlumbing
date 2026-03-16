import React, { useState } from "react";
import { BookOpenCheck, DollarSign, Crown } from "lucide-react";
import BookingsList from "./BookingsList";
import PricingServices from "./PricingServices";

export default function Bookings() {
  const [tab, setTab] = useState<"bookings" | "pricing">("bookings");

  return (
    <div className="space-y-4 pb-12">
      <div className="flex gap-2 bg-white rounded-2xl border border-border/60 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setTab("bookings")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "bookings" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BookOpenCheck className="w-4 h-4" /> Bookings
        </button>
        <button
          onClick={() => setTab("pricing")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "pricing" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Crown className="w-4 h-4" /> Pricing & Plans
        </button>
      </div>

      {tab === "bookings" ? <BookingsList /> : <PricingServices />}
    </div>
  );
}
