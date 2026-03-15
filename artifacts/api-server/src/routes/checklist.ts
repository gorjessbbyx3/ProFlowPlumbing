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
  { category: "Business Registration & Licensing", title: "Register business entity (LLC or Sole Proprietorship)", sortOrder: 1 },
  { category: "Business Registration & Licensing", title: "Obtain state business license", sortOrder: 2 },
  { category: "Business Registration & Licensing", title: "Get Hawaii General Excise Tax (GET) license", sortOrder: 3 },
  { category: "Business Registration & Licensing", title: "Obtain Federal EIN (Employer Identification Number)", sortOrder: 4 },
  { category: "Business Registration & Licensing", title: "Register DBA (Doing Business As) if needed", sortOrder: 5 },

  { category: "Insurance", title: "Get general liability insurance", sortOrder: 6 },
  { category: "Insurance", title: "Obtain surety bond", sortOrder: 7 },
  { category: "Insurance", title: "Set up workers compensation insurance", sortOrder: 8 },
  { category: "Insurance", title: "Get commercial auto insurance", sortOrder: 9 },
  { category: "Insurance", title: "Consider professional liability (errors & omissions) insurance", sortOrder: 10 },

  { category: "Equipment & Supplies", title: "Purchase commercial-grade cleaning products (all-purpose, glass, disinfectant)", sortOrder: 11 },
  { category: "Equipment & Supplies", title: "Buy commercial vacuum cleaner", sortOrder: 12 },
  { category: "Equipment & Supplies", title: "Purchase pressure washer for exterior jobs", sortOrder: 13 },
  { category: "Equipment & Supplies", title: "Stock microfiber cloths and towels", sortOrder: 14 },
  { category: "Equipment & Supplies", title: "Buy mop, buckets, and squeegees", sortOrder: 15 },
  { category: "Equipment & Supplies", title: "Get extension poles for high areas", sortOrder: 16 },
  { category: "Equipment & Supplies", title: "Purchase safety gear (gloves, goggles, masks)", sortOrder: 17 },
  { category: "Equipment & Supplies", title: "Buy caddy/organizer for carrying supplies", sortOrder: 18 },
  { category: "Equipment & Supplies", title: "Stock trash bags and disposable supplies", sortOrder: 19 },
  { category: "Equipment & Supplies", title: "Purchase specialty boat/marine cleaning products", sortOrder: 20 },
  { category: "Equipment & Supplies", title: "Get auto detailing supplies (wax, tire shine, interior cleaner)", sortOrder: 21 },

  { category: "Vehicle & Transportation", title: "Acquire work vehicle (van, truck, or SUV)", sortOrder: 22 },
  { category: "Vehicle & Transportation", title: "Get vehicle signage/wrap with company branding", sortOrder: 23 },
  { category: "Vehicle & Transportation", title: "Set up fuel budget and tracking", sortOrder: 24 },
  { category: "Vehicle & Transportation", title: "Install vehicle storage/organization system", sortOrder: 25 },

  { category: "Financial Setup", title: "Open dedicated business bank account", sortOrder: 26 },
  { category: "Financial Setup", title: "Set up bookkeeping/accounting system", sortOrder: 27 },
  { category: "Financial Setup", title: "Create pricing structure for all service types", sortOrder: 28 },
  { category: "Financial Setup", title: "Set up payment methods (cash, check, Venmo, Zelle, card)", sortOrder: 29 },
  { category: "Financial Setup", title: "Create invoice templates", sortOrder: 30 },
  { category: "Financial Setup", title: "Set up expense tracking system", sortOrder: 31 },
  { category: "Financial Setup", title: "Plan for quarterly GET tax payments", sortOrder: 32 },

  { category: "Marketing & Branding", title: "Design and print business cards", sortOrder: 33 },
  { category: "Marketing & Branding", title: "Create professional logo", sortOrder: 34 },
  { category: "Marketing & Branding", title: "Build company website", sortOrder: 35 },
  { category: "Marketing & Branding", title: "Set up Facebook business page", sortOrder: 36 },
  { category: "Marketing & Branding", title: "Create Instagram business profile", sortOrder: 37 },
  { category: "Marketing & Branding", title: "Set up Google Business Profile (Google Maps listing)", sortOrder: 38 },
  { category: "Marketing & Branding", title: "Create Yelp business listing", sortOrder: 39 },
  { category: "Marketing & Branding", title: "Order branded uniforms/shirts", sortOrder: 40 },
  { category: "Marketing & Branding", title: "Create flyers and door hangers", sortOrder: 41 },
  { category: "Marketing & Branding", title: "Set up a referral program", sortOrder: 42 },
  { category: "Marketing & Branding", title: "Join local business directories (BBB, Chamber of Commerce)", sortOrder: 43 },

  { category: "Legal & Contracts", title: "Create service agreement/contract template", sortOrder: 44 },
  { category: "Legal & Contracts", title: "Draft liability waiver for clients", sortOrder: 45 },
  { category: "Legal & Contracts", title: "Write cancellation and refund policy", sortOrder: 46 },
  { category: "Legal & Contracts", title: "Create employee/contractor agreements", sortOrder: 47 },
  { category: "Legal & Contracts", title: "Establish terms and conditions for services", sortOrder: 48 },
  { category: "Legal & Contracts", title: "Review local regulations for cleaning businesses", sortOrder: 49 },

  { category: "Staffing", title: "Create hiring plan and job descriptions", sortOrder: 50 },
  { category: "Staffing", title: "Set up background check process", sortOrder: 51 },
  { category: "Staffing", title: "Develop employee training program", sortOrder: 52 },
  { category: "Staffing", title: "Set up payroll system", sortOrder: 53 },
  { category: "Staffing", title: "Create employee handbook/policies", sortOrder: 54 },
  { category: "Staffing", title: "Establish uniform/dress code policy", sortOrder: 55 },

  { category: "Operations", title: "Set up scheduling and booking system", sortOrder: 56 },
  { category: "Operations", title: "Create supply inventory tracking", sortOrder: 57 },
  { category: "Operations", title: "Develop quality inspection checklist", sortOrder: 58 },
  { category: "Operations", title: "Set up customer feedback/review collection process", sortOrder: 59 },
  { category: "Operations", title: "Create standard operating procedures (SOPs) for each service", sortOrder: 60 },
  { category: "Operations", title: "Establish emergency/incident response procedures", sortOrder: 61 },
  { category: "Operations", title: "Set up client communication templates (confirmation, reminders)", sortOrder: 62 },
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
