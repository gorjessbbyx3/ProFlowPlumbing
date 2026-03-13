import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import {
  CreateExpenseBody,
  ListExpensesQueryParams,
  ListExpensesResponse,
  UpdateExpenseParams,
  UpdateExpenseBody,
  UpdateExpenseResponse,
  DeleteExpenseParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/expenses", async (req, res): Promise<void> => {
  const query = ListExpensesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.startDate) conditions.push(gte(expensesTable.date, query.data.startDate));
  if (query.data.endDate) conditions.push(lte(expensesTable.date, query.data.endDate));
  if (query.data.category) conditions.push(eq(expensesTable.category, query.data.category));

  const expenses = conditions.length > 0
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(expensesTable.date)
    : await db.select().from(expensesTable).orderBy(expensesTable.date);
  res.json(ListExpensesResponse.parse(expenses));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [expense] = await db.insert(expensesTable).values(parsed.data).returning();
  res.status(201).json(UpdateExpenseResponse.parse(expense));
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [expense] = await db.update(expensesTable).set(parsed.data).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.json(UpdateExpenseResponse.parse(expense));
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [expense] = await db.delete(expensesTable).where(eq(expensesTable.id, params.data.id)).returning();
  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
