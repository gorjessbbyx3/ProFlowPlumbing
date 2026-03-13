import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, receiptsTable } from "@workspace/db";
import {
  CreateReceiptBody,
  ListReceiptsResponse,
  UpdateReceiptBody,
  UpdateReceiptParams,
  DeleteReceiptParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/receipts", async (_req, res): Promise<void> => {
  const receipts = await db.select().from(receiptsTable).orderBy(receiptsTable.createdAt);
  res.json(ListReceiptsResponse.parse(receipts));
});

router.post("/receipts", async (req, res): Promise<void> => {
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [receipt] = await db.insert(receiptsTable).values(parsed.data).returning();
  res.status(201).json(receipt);
});

router.put("/receipts/:id", async (req, res): Promise<void> => {
  const params = UpdateReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateReceiptBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [receipt] = await db.update(receiptsTable).set(body.data).where(eq(receiptsTable.id, params.data.id)).returning();
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.json(receipt);
});

router.delete("/receipts/:id", async (req, res): Promise<void> => {
  const params = DeleteReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [receipt] = await db.delete(receiptsTable).where(eq(receiptsTable.id, params.data.id)).returning();
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
