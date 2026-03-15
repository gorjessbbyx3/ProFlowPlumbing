import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, bookingsTable } from "@workspace/db";
import {
  CreateBookingBody,
  ListBookingsQueryParams,
  ListBookingsResponse,
  GetBookingParams,
  GetBookingResponse,
  UpdateBookingParams,
  UpdateBookingBody,
  UpdateBookingResponse,
  DeleteBookingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/bookings", async (req, res): Promise<void> => {
  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.status) conditions.push(eq(bookingsTable.status, query.data.status));
  if (query.data.date) conditions.push(eq(bookingsTable.date, query.data.date));

  const bookings = conditions.length > 0
    ? await db.select().from(bookingsTable).where(and(...conditions)).orderBy(desc(bookingsTable.date))
    : await db.select().from(bookingsTable).orderBy(desc(bookingsTable.date));
  res.json(ListBookingsResponse.parse(bookings));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
  res.status(201).json(GetBookingResponse.parse(booking));
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(GetBookingResponse.parse(booking));
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db.update(bookingsTable).set(parsed.data).where(eq(bookingsTable.id, params.data.id)).returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(UpdateBookingResponse.parse(booking));
});

router.delete("/bookings/:id", async (req, res): Promise<void> => {
  const params = DeleteBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db.delete(bookingsTable).where(eq(bookingsTable.id, params.data.id)).returning();
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.sendStatus(204);
});

// Generate recurring bookings from a template (wrapped in a transaction)
router.post("/bookings/:id/generate-recurring", async (req, res): Promise<void> => {
  const bookingId = Number(req.params.id);
  if (isNaN(bookingId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [source] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!source) { res.status(404).json({ error: "Booking not found" }); return; }
  if (!source.recurrenceFrequency) { res.status(400).json({ error: "Booking has no recurrence set" }); return; }

  const freq = source.recurrenceFrequency;
  const endDate = source.recurrenceEndDate ? new Date(source.recurrenceEndDate) : null;
  const horizon = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months default

  const daysToAdd = freq === "weekly" ? 7 : freq === "biweekly" ? 14 : 30;
  let currentDate = new Date(source.date);

  // Find existing child bookings to avoid duplicates
  const existing = await db.select().from(bookingsTable).where(eq(bookingsTable.parentBookingId, bookingId));
  const existingDates = new Set(existing.map(b => b.date));

  // Build all values first, then insert in a single transaction
  const valuesToInsert: (typeof bookingsTable.$inferInsert)[] = [];
  for (let i = 0; i < 52; i++) {
    currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    if (currentDate > horizon) break;

    const dateStr = currentDate.toISOString().split("T")[0]!;
    if (existingDates.has(dateStr)) continue;

    valuesToInsert.push({
      clientId: source.clientId,
      employeeId: source.employeeId,
      serviceType: source.serviceType,
      status: "scheduled" as const,
      date: dateStr,
      time: source.time,
      location: source.location,
      notes: source.notes,
      estimatedPrice: source.estimatedPrice,
      clientName: source.clientName,
      clientPhone: source.clientPhone,
      clientEmail: source.clientEmail,
      recurrenceFrequency: null,
      parentBookingId: bookingId,
      latitude: source.latitude,
      longitude: source.longitude,
    });
  }

  if (valuesToInsert.length === 0) {
    res.json([]);
    return;
  }

  const created = await db.transaction(async (tx) => {
    return tx.insert(bookingsTable).values(valuesToInsert).returning();
  });

  res.json(created);
});

export default router;
