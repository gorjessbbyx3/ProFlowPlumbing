import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, shiftsTable } from "@workspace/db";
import {
  CreateShiftBody,
  ListShiftsQueryParams,
  ListShiftsResponse,
  UpdateShiftParams,
  UpdateShiftBody,
  UpdateShiftResponse,
  DeleteShiftParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/shifts", async (req, res): Promise<void> => {
  const query = ListShiftsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.employeeId) conditions.push(eq(shiftsTable.employeeId, query.data.employeeId));
  if (query.data.startDate) conditions.push(gte(shiftsTable.date, query.data.startDate));
  if (query.data.endDate) conditions.push(lte(shiftsTable.date, query.data.endDate));

  const shifts = conditions.length > 0
    ? await db.select().from(shiftsTable).where(and(...conditions)).orderBy(shiftsTable.date)
    : await db.select().from(shiftsTable).orderBy(shiftsTable.date);
  res.json(ListShiftsResponse.parse(shifts));
});

router.post("/shifts", async (req, res): Promise<void> => {
  const parsed = CreateShiftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [shift] = await db.insert(shiftsTable).values(parsed.data).returning();
  res.status(201).json(UpdateShiftResponse.parse(shift));
});

router.patch("/shifts/:id", async (req, res): Promise<void> => {
  const params = UpdateShiftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateShiftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [shift] = await db.update(shiftsTable).set(parsed.data).where(eq(shiftsTable.id, params.data.id)).returning();
  if (!shift) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.json(UpdateShiftResponse.parse(shift));
});

router.delete("/shifts/:id", async (req, res): Promise<void> => {
  const params = DeleteShiftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [shift] = await db.delete(shiftsTable).where(eq(shiftsTable.id, params.data.id)).returning();
  if (!shift) {
    res.status(404).json({ error: "Shift not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
