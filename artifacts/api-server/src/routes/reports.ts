import { Router, type IRouter } from "express";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import { db, invoicesTable, expensesTable, laborEntriesTable, bookingsTable, employeesTable, todosTable, followupsTable } from "@workspace/db";
import {
  GetTaxSummaryQueryParams,
  GetTaxSummaryResponse,
  GetDashboardStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/tax-summary", async (req, res): Promise<void> => {
  const query = GetTaxSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { startDate, endDate } = query.data;

  const paidInvoices = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${invoicesTable.total} AS DECIMAL)), 0)::text` })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.status, "paid"),
      gte(invoicesTable.createdAt, new Date(startDate)),
      lte(invoicesTable.createdAt, new Date(endDate + "T23:59:59.999Z"))
    ));

  const expenseTotal = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)::text` })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.date, startDate),
      lte(expensesTable.date, endDate)
    ));

  const laborTotal = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${laborEntriesTable.totalPay} AS DECIMAL)), 0)::text` })
    .from(laborEntriesTable)
    .where(and(
      gte(laborEntriesTable.date, startDate),
      lte(laborEntriesTable.date, endDate)
    ));

  const invoiceCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.status, "paid"),
      gte(invoicesTable.createdAt, new Date(startDate)),
      lte(invoicesTable.createdAt, new Date(endDate + "T23:59:59.999Z"))
    ));

  const expenseCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.date, startDate),
      lte(expensesTable.date, endDate)
    ));

  const laborCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(laborEntriesTable)
    .where(and(
      gte(laborEntriesTable.date, startDate),
      lte(laborEntriesTable.date, endDate)
    ));

  const expensesByCategory = await db
    .select({
      category: expensesTable.category,
      total: sql<string>`COALESCE(SUM(CAST(${expensesTable.amount} AS DECIMAL)), 0)::text`,
    })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.date, startDate),
      lte(expensesTable.date, endDate)
    ))
    .groupBy(expensesTable.category);

  const income = parseFloat(paidInvoices[0]?.total || "0");
  const expenses = parseFloat(expenseTotal[0]?.total || "0");
  const labor = parseFloat(laborTotal[0]?.total || "0");
  const netProfit = income - expenses - labor;

  const result = {
    totalIncome: income.toFixed(2),
    totalExpenses: expenses.toFixed(2),
    totalLaborCosts: labor.toFixed(2),
    netProfit: netProfit.toFixed(2),
    invoiceCount: invoiceCountResult[0]?.count || 0,
    expenseCount: expenseCountResult[0]?.count || 0,
    laborEntryCount: laborCountResult[0]?.count || 0,
    expensesByCategory: expensesByCategory.map(e => ({
      category: e.category,
      total: parseFloat(e.total).toFixed(2),
    })),
  };

  res.json(GetTaxSummaryResponse.parse(result));
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;

  const todayBookingsResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bookingsTable)
    .where(eq(bookingsTable.date, today));

  const pendingInvoicesResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "unpaid"));

  const totalRevenueResult = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${invoicesTable.total} AS DECIMAL)), 0)::text` })
    .from(invoicesTable)
    .where(eq(invoicesTable.status, "paid"));

  const activeEmployeesResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"));

  const pendingTodosResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(todosTable)
    .where(eq(todosTable.completed, false));

  const pendingFollowupsResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(followupsTable)
    .where(eq(followupsTable.status, "pending"));

  const recentBookings = await db
    .select()
    .from(bookingsTable)
    .orderBy(sql`${bookingsTable.date} DESC, ${bookingsTable.time} DESC`)
    .limit(5);

  const stats = {
    todayBookings: todayBookingsResult[0]?.count || 0,
    pendingInvoices: pendingInvoicesResult[0]?.count || 0,
    totalRevenue: parseFloat(totalRevenueResult[0]?.total || "0").toFixed(2),
    activeEmployees: activeEmployeesResult[0]?.count || 0,
    pendingTodos: pendingTodosResult[0]?.count || 0,
    pendingFollowups: pendingFollowupsResult[0]?.count || 0,
    recentBookings,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
