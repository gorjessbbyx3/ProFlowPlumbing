import React, { useState } from "react";
import { Receipt, DollarSign } from "lucide-react";
import Receipts from "./Receipts";
import Expenses from "./Expenses";

export default function Money() {
  const [tab, setTab] = useState<"receipts" | "expenses">("receipts");

  return (
    <div className="space-y-4 pb-12">
      <div className="flex gap-2 bg-white rounded-2xl border border-border/60 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setTab("receipts")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "receipts" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Receipt className="w-4 h-4" /> Receipts
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab === "expenses" ? "bg-primary text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <DollarSign className="w-4 h-4" /> Expenses
        </button>
      </div>

      {tab === "receipts" ? <Receipts /> : <Expenses />}
    </div>
  );
}
