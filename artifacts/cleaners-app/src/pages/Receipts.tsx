import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import {
  Folder, FolderOpen, Image, X, ChevronRight, Receipt,
  Calendar, DollarSign, Search, Grid3X3, List, ArrowLeft
} from "lucide-react";

interface ExpenseItem {
  id: number; category: string; description: string; amount: string; date: string;
  vendor: string | null; notes: string | null; receiptImage: string | null;
  createdAt: string; updatedAt: string;
}

type ViewMode = "folders" | "grid";
type GroupBy = "category" | "month" | "vendor";

export default function Receipts() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<ExpenseItem | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/expenses").then(r => r.json()).then(data => { setExpenses(data); setIsLoading(false); });
  }, []);

  // Only expenses with receipt images
  const receipts = useMemo(() => {
    let filtered = expenses.filter(e => e.receiptImage);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.vendor || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [expenses, search]);

  // Group receipts into folders
  const folders = useMemo(() => {
    const map: Record<string, ExpenseItem[]> = {};
    receipts.forEach(e => {
      let key: string;
      if (groupBy === "category") key = e.category;
      else if (groupBy === "month") {
        const d = new Date(e.date);
        key = d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      } else {
        key = e.vendor || "No Vendor";
      }
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    // Sort folders by name
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [receipts, groupBy]);

  const folderTotal = (items: ExpenseItem[]) => items.reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
  const totalReceipts = receipts.length;
  const totalAmount = receipts.reduce((s, e) => s + parseFloat(e.amount || "0"), 0);

  const folderIcon = (name: string) => {
    if (name === openFolder) return <FolderOpen className="w-6 h-6 text-amber-500" />;
    return <Folder className="w-6 h-6 text-amber-400" />;
  };

  const categoryEmoji: Record<string, string> = {
    Supplies: "🧹", Fuel: "⛽", Equipment: "🔧", Insurance: "🛡️",
    Marketing: "📣", Vehicle: "🚗", Office: "🏢", Other: "📦",
  };

  if (isLoading) return <div className="text-center py-12 text-slate-500">Loading receipts...</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receipt Gallery"
        subtitle={`${totalReceipts} receipts · ${formatCurrency(totalAmount)} total`}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white min-h-[44px]"
          />
        </div>
        <select value={groupBy} onChange={e => { setGroupBy(e.target.value as GroupBy); setOpenFolder(null); }} className="border rounded-xl px-3 py-2.5 text-sm font-medium bg-white min-h-[44px]">
          <option value="category">By Category</option>
          <option value="month">By Month</option>
          <option value="vendor">By Vendor</option>
        </select>
        <div className="flex bg-white border rounded-xl overflow-hidden">
          <button onClick={() => setViewMode("folders")} className={`p-2.5 ${viewMode === "folders" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("grid")} className={`p-2.5 ${viewMode === "grid" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {receipts.length === 0 ? (
        <Card className="p-12 text-center">
          <Image className="w-14 h-14 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No receipt photos yet.</p>
          <p className="text-sm text-slate-400 mt-1">Add receipt photos when creating expenses to see them here.</p>
        </Card>
      ) : viewMode === "grid" ? (
        /* ─── Grid View ─── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {receipts.map(e => (
            <div
              key={e.id}
              onClick={() => setViewImage(e)}
              className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <img src={e.receiptImage!} alt={e.description} className="w-full h-36 object-cover" />
              <div className="p-2.5">
                <p className="text-xs font-bold text-slate-800 truncate">{e.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">{e.date}</span>
                  <span className="text-xs font-bold text-rose-600">{formatCurrency(e.amount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── Folder View ─── */
        <div className="space-y-2">
          {openFolder ? (
            <>
              {/* Breadcrumb */}
              <button onClick={() => setOpenFolder(null)} className="flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-3">
                <ArrowLeft className="w-4 h-4" /> Back to folders
              </button>

              {/* Open folder contents */}
              <div className="flex items-center gap-3 mb-4">
                <FolderOpen className="w-7 h-7 text-amber-500" />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{openFolder}</h3>
                  <p className="text-sm text-slate-500">
                    {folders.find(f => f[0] === openFolder)?.[1].length || 0} receipts ·{" "}
                    {formatCurrency(folderTotal(folders.find(f => f[0] === openFolder)?.[1] || []))}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {folders.find(f => f[0] === openFolder)?.[1].map(e => (
                  <div
                    key={e.id}
                    onClick={() => setViewImage(e)}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all"
                  >
                    <img src={e.receiptImage!} alt={e.description} className="w-full h-32 object-cover" />
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{e.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400">{e.date}</span>
                        <span className="text-xs font-bold text-rose-600">{formatCurrency(e.amount)}</span>
                      </div>
                      {e.vendor && <p className="text-[10px] text-slate-400 truncate mt-0.5">{e.vendor}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Folder list */
            folders.map(([name, items]) => (
              <Card
                key={name}
                className="p-4 cursor-pointer hover:bg-slate-50 hover:border-primary/20 transition-all active:scale-[0.99]"
                onClick={() => setOpenFolder(name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {folderIcon(name)}
                    <div>
                      <div className="flex items-center gap-2">
                        {groupBy === "category" && <span className="text-base">{categoryEmoji[name] || "📁"}</span>}
                        <p className="font-bold text-slate-900">{name}</p>
                      </div>
                      <p className="text-sm text-slate-500">{items.length} receipt{items.length !== 1 ? "s" : ""} · {formatCurrency(folderTotal(items))}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Thumbnail stack */}
                    <div className="flex -space-x-3">
                      {items.slice(0, 3).map((e, i) => (
                        <img key={e.id} src={e.receiptImage!} alt="" className="w-9 h-9 object-cover rounded-lg border-2 border-white shadow-sm" style={{ zIndex: 3 - i }} />
                      ))}
                      {items.length > 3 && (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-slate-500">
                          +{items.length - 3}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Full-size image viewer with details */}
      {viewImage && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex flex-col items-center justify-center p-4" onClick={() => setViewImage(null)}>
          <div className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <img src={viewImage.receiptImage!} alt="Receipt" className="w-full max-h-[60vh] object-contain rounded-xl" />
            <div className="bg-white rounded-2xl p-4 mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">{viewImage.description}</p>
                <span className="font-bold text-rose-600">{formatCurrency(viewImage.amount)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {viewImage.date}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full text-xs font-medium">{viewImage.category}</span>
              </div>
              {viewImage.vendor && <p className="text-sm text-slate-500">Vendor: {viewImage.vendor}</p>}
              {viewImage.notes && <p className="text-sm text-slate-400">{viewImage.notes}</p>}
            </div>
          </div>
          <button onClick={() => setViewImage(null)} className="absolute top-4 right-4 p-2.5 bg-white/20 rounded-full text-white hover:bg-white/30">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
