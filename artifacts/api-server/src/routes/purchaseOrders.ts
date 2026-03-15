import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, purchaseOrdersTable, insertPurchaseOrderSchema } from "@workspace/db";

const router: IRouter = Router();

function safeParseItems(items: string | null | undefined): unknown[] {
  if (!items) return [];
  try { return JSON.parse(items); } catch { return []; }
}

router.get("/purchase-orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt));
  const parsed = orders.map(o => ({ ...o, items: safeParseItems(o.items) }));
  res.json(parsed);
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  if (!Array.isArray(req.body.items)) { res.status(400).json({ error: "items must be an array" }); return; }
  const data = { ...req.body, items: JSON.stringify(req.body.items) };
  const parsed = insertPurchaseOrderSchema.safeParse(data);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [order] = await db.insert(purchaseOrdersTable).values(parsed.data).returning();
  res.status(201).json({ ...order, items: safeParseItems(order.items) });
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  if (req.body.items !== undefined && !Array.isArray(req.body.items)) { res.status(400).json({ error: "items must be an array" }); return; }
  const data = req.body.items ? { ...req.body, items: JSON.stringify(req.body.items) } : req.body;
  const parsed = insertPurchaseOrderSchema.partial().safeParse(data);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [order] = await db.update(purchaseOrdersTable).set(parsed.data).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...order, items: safeParseItems(order.items) });
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [order] = await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
