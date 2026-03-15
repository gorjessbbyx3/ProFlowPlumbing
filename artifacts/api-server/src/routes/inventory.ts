import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, inventoryTable, insertInventorySchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/inventory", async (_req, res): Promise<void> => {
  const items = await db.select().from(inventoryTable).orderBy(desc(inventoryTable.updatedAt));
  res.json(items);
});

router.post("/inventory", async (req, res): Promise<void> => {
  const parsed = insertInventorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(inventoryTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const parsed = insertInventorySchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.update(inventoryTable).set(parsed.data).where(eq(inventoryTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.delete("/inventory/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [item] = await db.delete(inventoryTable).where(eq(inventoryTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
