import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, checklistItemsTable } from "@workspace/db";
import {
  ListChecklistItemsResponse,
  UpdateChecklistItemParams,
  UpdateChecklistItemBody,
  UpdateChecklistItemResponse,
  CreateChecklistItemBody,
  DeleteChecklistItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SEED_CHECKLIST = [
  // Business Registration & Licensing
  { category: "Business Registration & Licensing", title: "Register business entity (LLC or Sole Proprietorship)", sortOrder: 1 },
  { category: "Business Registration & Licensing", title: "Obtain state contractor's license (plumbing)", sortOrder: 2 },
  { category: "Business Registration & Licensing", title: "Get Hawaii General Excise Tax (GET) license", sortOrder: 3 },
  { category: "Business Registration & Licensing", title: "Obtain Federal EIN (Employer Identification Number)", sortOrder: 4 },
  { category: "Business Registration & Licensing", title: "Register DBA (Doing Business As) if needed", sortOrder: 5 },
  { category: "Business Registration & Licensing", title: "Verify all journeyman/master plumber licenses are current", sortOrder: 6 },

  // Insurance & Bonding
  { category: "Insurance & Bonding", title: "Get general liability insurance (minimum $1M coverage)", sortOrder: 7 },
  { category: "Insurance & Bonding", title: "Obtain plumber's surety bond", sortOrder: 8 },
  { category: "Insurance & Bonding", title: "Set up workers compensation insurance", sortOrder: 9 },
  { category: "Insurance & Bonding", title: "Get commercial auto insurance for service vehicles", sortOrder: 10 },
  { category: "Insurance & Bonding", title: "Consider professional liability (errors & omissions) insurance", sortOrder: 11 },
  { category: "Insurance & Bonding", title: "Obtain tools & equipment insurance", sortOrder: 12 },

  // Tools & Equipment
  { category: "Tools & Equipment", title: "Purchase pipe wrenches (various sizes)", sortOrder: 13 },
  { category: "Tools & Equipment", title: "Buy drain snake / auger (hand and electric)", sortOrder: 14 },
  { category: "Tools & Equipment", title: "Get hydro-jetting machine", sortOrder: 15 },
  { category: "Tools & Equipment", title: "Purchase pipe cutter and deburring tools", sortOrder: 16 },
  { category: "Tools & Equipment", title: "Buy soldering torch and fittings", sortOrder: 17 },
  { category: "Tools & Equipment", title: "Get leak detection equipment", sortOrder: 18 },
  { category: "Tools & Equipment", title: "Purchase channel-lock pliers and adjustable wrenches", sortOrder: 19 },
  { category: "Tools & Equipment", title: "Buy safety gear (gloves, goggles, knee pads, respirators)", sortOrder: 20 },
  { category: "Tools & Equipment", title: "Stock PVC/CPVC/copper pipe and fittings starter inventory", sortOrder: 21 },
  { category: "Tools & Equipment", title: "Purchase pipe inspection camera", sortOrder: 22 },

  // Vehicle & Transportation
  { category: "Vehicle & Transportation", title: "Acquire service van or truck", sortOrder: 23 },
  { category: "Vehicle & Transportation", title: "Get vehicle signage/wrap with company branding", sortOrder: 24 },
  { category: "Vehicle & Transportation", title: "Install shelving/organization system in work vehicle", sortOrder: 25 },
  { category: "Vehicle & Transportation", title: "Set up fuel budget and mileage tracking", sortOrder: 26 },
  { category: "Vehicle & Transportation", title: "Stock emergency parts kit in each vehicle", sortOrder: 27 },

  // Financial Setup
  { category: "Financial Setup", title: "Open dedicated business bank account", sortOrder: 28 },
  { category: "Financial Setup", title: "Set up bookkeeping/accounting system", sortOrder: 29 },
  { category: "Financial Setup", title: "Create pricing structure for all service types", sortOrder: 30 },
  { category: "Financial Setup", title: "Set up payment methods (cash, check, Venmo, Zelle, card)", sortOrder: 31 },
  { category: "Financial Setup", title: "Create invoice and estimate templates", sortOrder: 32 },
  { category: "Financial Setup", title: "Set up expense tracking system", sortOrder: 33 },
  { category: "Financial Setup", title: "Plan for quarterly GET tax payments", sortOrder: 34 },
  { category: "Financial Setup", title: "Establish parts markup pricing policy", sortOrder: 35 },

  // Marketing & Branding
  { category: "Marketing & Branding", title: "Design and print business cards", sortOrder: 36 },
  { category: "Marketing & Branding", title: "Create professional logo and brand identity", sortOrder: 37 },
  { category: "Marketing & Branding", title: "Build company website with service list and contact form", sortOrder: 38 },
  { category: "Marketing & Branding", title: "Set up Google Business Profile (Google Maps listing)", sortOrder: 39 },
  { category: "Marketing & Branding", title: "Create Yelp business listing", sortOrder: 40 },
  { category: "Marketing & Branding", title: "Set up Facebook and NextDoor business pages", sortOrder: 41 },
  { category: "Marketing & Branding", title: "Order branded uniforms and hats", sortOrder: 42 },
  { category: "Marketing & Branding", title: "Set up a referral reward program", sortOrder: 43 },
  { category: "Marketing & Branding", title: "Join local business directories (BBB, PHCC, Chamber of Commerce)", sortOrder: 44 },

  // Legal & Contracts
  { category: "Legal & Contracts", title: "Create service agreement/work order contract template", sortOrder: 45 },
  { category: "Legal & Contracts", title: "Draft liability waiver for clients", sortOrder: 46 },
  { category: "Legal & Contracts", title: "Write cancellation and no-show policy", sortOrder: 47 },
  { category: "Legal & Contracts", title: "Create employee/subcontractor agreements", sortOrder: 48 },
  { category: "Legal & Contracts", title: "Review local plumbing codes and permit requirements", sortOrder: 49 },
  { category: "Legal & Contracts", title: "Establish change-order process for scope expansions", sortOrder: 50 },

  // Staffing
  { category: "Staffing", title: "Create hiring plan and job descriptions (apprentice, journeyman, master)", sortOrder: 51 },
  { category: "Staffing", title: "Set up background check and drug test process", sortOrder: 52 },
  { category: "Staffing", title: "Develop field technician training program", sortOrder: 53 },
  { category: "Staffing", title: "Set up payroll system", sortOrder: 54 },
  { category: "Staffing", title: "Create employee handbook/safety policies", sortOrder: 55 },
  { category: "Staffing", title: "Establish on-call rotation for emergency jobs", sortOrder: 56 },

  // Operations
  { category: "Operations", title: "Set up dispatch and scheduling system", sortOrder: 57 },
  { category: "Operations", title: "Create parts and inventory tracking system", sortOrder: 58 },
  { category: "Operations", title: "Develop job completion checklist (permits, photos, sign-off)", sortOrder: 59 },
  { category: "Operations", title: "Set up customer review collection process (Google, Yelp)", sortOrder: 60 },
  { category: "Operations", title: "Create SOPs for common jobs (drain clean, water heater, leak repair)", sortOrder: 61 },
  { category: "Operations", title: "Establish 24/7 emergency call handling procedure", sortOrder: 62 },
  { category: "Operations", title: "Set up client communication templates (estimates, confirmations, follow-ups)", sortOrder: 63 },
];

let seedPromise: Promise<void> | null = null;

async function seedChecklistIfNeeded() {
  const [result] = await db.select({ total: count() }).from(checklistItemsTable);
  if (result && result.total === 0) {
    // Use a transaction to prevent race conditions with concurrent server starts
    await db.transaction(async (tx) => {
      // Re-check inside transaction to avoid duplicates
      const [recheck] = await tx.select({ total: count() }).from(checklistItemsTable);
      if (recheck && recheck.total === 0) {
        await tx.insert(checklistItemsTable).values(SEED_CHECKLIST);
      }
    });
  }
}

seedPromise = seedChecklistIfNeeded().catch((err) => { console.error("Failed to seed checklist:", err); });

router.get("/checklist", async (_req, res): Promise<void> => {
  const items = await db.select().from(checklistItemsTable).orderBy(checklistItemsTable.sortOrder);
  res.json(ListChecklistItemsResponse.parse(items));
});

router.get("/checklist/:id", async (req, res): Promise<void> => {
  const params = UpdateChecklistItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.select().from(checklistItemsTable).where(eq(checklistItemsTable.id, params.data.id));
  if (!item) { res.status(404).json({ error: "Checklist item not found" }); return; }
  res.json(UpdateChecklistItemResponse.parse(item));
});

router.post("/checklist", async (req, res): Promise<void> => {
  const parsed = CreateChecklistItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [item] = await db.insert(checklistItemsTable).values(parsed.data).returning();
  res.status(201).json(UpdateChecklistItemResponse.parse(item));
});

router.patch("/checklist/:id", async (req, res): Promise<void> => {
  const params = UpdateChecklistItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateChecklistItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.update(checklistItemsTable).set(parsed.data).where(eq(checklistItemsTable.id, params.data.id)).returning();
  if (!item) {
    res.status(404).json({ error: "Checklist item not found" });
    return;
  }
  res.json(UpdateChecklistItemResponse.parse(item));
});

router.delete("/checklist/:id", async (req, res): Promise<void> => {
  const params = DeleteChecklistItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [item] = await db.delete(checklistItemsTable).where(eq(checklistItemsTable.id, params.data.id)).returning();
  if (!item) { res.status(404).json({ error: "Checklist item not found" }); return; }
  res.sendStatus(204);
});

export default router;
