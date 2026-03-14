import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, purchaseOrdersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/purchase-orders", async (_req, res): Promise<void> => {
  const orders = await db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt));
  // Parse items JSON for each order
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json(parsed);
});

router.post("/purchase-orders", async (req, res): Promise<void> => {
  const data = { ...req.body, items: JSON.stringify(req.body.items) };
  const [order] = await db.insert(purchaseOrdersTable).values(data).returning();
  res.status(201).json({ ...order, items: JSON.parse(order.items) });
});

router.patch("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const data = req.body.items ? { ...req.body, items: JSON.stringify(req.body.items) } : req.body;
  const [order] = await db.update(purchaseOrdersTable).set(data).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...order, items: JSON.parse(order.items) });
});

router.delete("/purchase-orders/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [order] = await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
