import React, { useState } from "react";
import { useGetTaxSummary } from "@workspace/api-client-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { PageHeader } from "@/components/Layout";
import { Card, Input, Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";
import { Printer, CalendarIcon } from "lucide-react";

const COLORS = ['#003087', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const { data: summary, isLoading } = useGetTaxSummary(dateRange);

  const handlePrint = () => {
    window.print();
  };

  const chartData = summary?.expensesByCategory?.map(item => ({
    name: item.category,
    value: parseFloat(item.total)
  })) || [];

  return (
    <div className="animate-fade-in pb-12 print:bg-white print:p-0">
      <div className="print:hidden">
        <PageHeader 
          title="Tax & Financial Reports" 
          description="View your income, expenses, and labor costs for tax preparation."
          action={<Button onClick={handlePrint} variant="outline" className="bg-white"><Printer className="w-4 h-4 mr-2"/> Print Report</Button>}
        />
        
        <Card className="p-5 mb-8 flex flex-wrap items-end gap-4 bg-primary/5 border-primary/20">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-bold text-slate-700">Start Date</label>
            <div className="relative">
              <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input type="date" value={dateRange.startDate} onChange={e => setDateRange(prev => ({...prev, startDate: e.target.value}))} className="pl-10" />
            </div>
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-sm font-bold text-slate-700">End Date</label>
            <div className="relative">
              <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input type="date" value={dateRange.endDate} onChange={e => setDateRange(prev => ({...prev, endDate: e.target.value}))} className="pl-10" />
            </div>
          </div>
        </Card>
      </div>

      {/* Printable Area Starts Here */}
      <div className="print:block">
        <div className="hidden print:block mb-8 text-center border-b pb-6">
          <h1 className="text-3xl font-bold font-display text-slate-900">Plumbing CRM</h1>
          <p className="text-lg text-slate-600 mt-2">Financial Summary Report</p>
          <p className="text-slate-500">{format(new Date(dateRange.startDate), 'MMM d, yyyy')} — {format(new Date(dateRange.endDate), 'MMM d, yyyy')}</p>
        </div>

        {isLoading ? (
          <div className="text-center p-12 text-slate-500 animate-pulse">Calculating financials...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-emerald-50 border-emerald-100">
                <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-2">Total Income</p>
                <p className="text-3xl font-black text-emerald-900">{formatCurrency(summary?.totalIncome)}</p>
                <p className="text-xs text-emerald-600 mt-2 font-medium">From {summary?.invoiceCount} paid invoices</p>
              </Card>
              
              <Card className="p-6 bg-rose-50 border-rose-100">
                <p className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-2">Total Expenses</p>
                <p className="text-3xl font-black text-rose-900">{formatCurrency(summary?.totalExpenses)}</p>
                <p className="text-xs text-rose-600 mt-2 font-medium">From {summary?.expenseCount} logged expenses</p>
              </Card>

              <Card className="p-6 bg-amber-50 border-amber-100">
                <p className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-2">Labor Costs</p>
                <p className="text-3xl font-black text-amber-900">{formatCurrency(summary?.totalLaborCosts)}</p>
                <p className="text-xs text-amber-600 mt-2 font-medium">From {summary?.laborEntryCount} shifts</p>
              </Card>

              <Card className="p-6 bg-primary text-white shadow-xl shadow-primary/20 border-transparent">
                <p className="text-sm font-bold text-primary-foreground/80 uppercase tracking-wider mb-2">Net Profit</p>
                <p className="text-3xl font-black">{formatCurrency(summary?.netProfit)}</p>
                <p className="text-xs text-primary-foreground/60 mt-2 font-medium">Income - Expenses - Labor</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="text-xl font-bold font-display mb-6">Expenses by Category</h3>
                {chartData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-400">No expense data for this period.</div>
                )}
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold font-display mb-6">Expense Breakdown</h3>
                <div className="space-y-4">
                  {chartData.length > 0 ? chartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-bold text-slate-700 capitalize">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                  )) : (
                    <div className="text-slate-400 text-center py-8">No records to display.</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
