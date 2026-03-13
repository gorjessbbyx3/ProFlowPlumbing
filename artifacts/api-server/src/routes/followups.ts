import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, followupsTable } from "@workspace/db";
import {
  CreateFollowupBody,
  ListFollowupsResponse,
  UpdateFollowupParams,
  UpdateFollowupBody,
  UpdateFollowupResponse,
  DeleteFollowupParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/followups", async (_req, res): Promise<void> => {
  const followups = await db.select().from(followupsTable).orderBy(followupsTable.dueDate);
  res.json(ListFollowupsResponse.parse(followups));
});

router.post("/followups", async (req, res): Promise<void> => {
  const parsed = CreateFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [followup] = await db.insert(followupsTable).values(parsed.data).returning();
  res.status(201).json(UpdateFollowupResponse.parse(followup));
});

router.patch("/followups/:id", async (req, res): Promise<void> => {
  const params = UpdateFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateFollowupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [followup] = await db.update(followupsTable).set(parsed.data).where(eq(followupsTable.id, params.data.id)).returning();
  if (!followup) {
    res.status(404).json({ error: "Follow-up not found" });
    return;
  }
  res.json(UpdateFollowupResponse.parse(followup));
});

router.delete("/followups/:id", async (req, res): Promise<void> => {
  const params = DeleteFollowupParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [followup] = await db.delete(followupsTable).where(eq(followupsTable.id, params.data.id)).returning();
  if (!followup) {
    res.status(404).json({ error: "Follow-up not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
