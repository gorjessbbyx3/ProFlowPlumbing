import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, laborEntriesTable } from "@workspace/db";
import {
  CreateLaborEntryBody,
  ListLaborEntriesQueryParams,
  ListLaborEntriesResponse,
  UpdateLaborEntryParams,
  UpdateLaborEntryBody,
  UpdateLaborEntryResponse,
  DeleteLaborEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/labor-entries", async (req, res): Promise<void> => {
  const query = ListLaborEntriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.employeeId) conditions.push(eq(laborEntriesTable.employeeId, query.data.employeeId));
  if (query.data.startDate) conditions.push(gte(laborEntriesTable.date, query.data.startDate));
  if (query.data.endDate) conditions.push(lte(laborEntriesTable.date, query.data.endDate));

  const entries = conditions.length > 0
    ? await db.select().from(laborEntriesTable).where(and(...conditions)).orderBy(laborEntriesTable.date)
    : await db.select().from(laborEntriesTable).orderBy(laborEntriesTable.date);
  res.json(ListLaborEntriesResponse.parse(entries));
});

router.get("/labor-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateLaborEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [entry] = await db.select().from(laborEntriesTable).where(eq(laborEntriesTable.id, params.data.id));
  if (!entry) { res.status(404).json({ error: "Labor entry not found" }); return; }
  res.json(UpdateLaborEntryResponse.parse(entry));
});

router.post("/labor-entries", async (req, res): Promise<void> => {
  const parsed = CreateLaborEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.insert(laborEntriesTable).values(parsed.data).returning();
  res.status(201).json(UpdateLaborEntryResponse.parse(entry));
});

router.patch("/labor-entries/:id", async (req, res): Promise<void> => {
  const params = UpdateLaborEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLaborEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [entry] = await db.update(laborEntriesTable).set(parsed.data).where(eq(laborEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Labor entry not found" });
    return;
  }
  res.json(UpdateLaborEntryResponse.parse(entry));
});

router.delete("/labor-entries/:id", async (req, res): Promise<void> => {
  const params = DeleteLaborEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(laborEntriesTable).where(eq(laborEntriesTable.id, params.data.id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Labor entry not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
