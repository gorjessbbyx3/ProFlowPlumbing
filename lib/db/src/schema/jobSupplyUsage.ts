import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobSupplyUsageTable = pgTable("job_supply_usage", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  inventoryId: integer("inventory_id").notNull(),
  quantityUsed: real("quantity_used").notNull().default(0),
  unitCost: text("unit_cost").default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSupplyUsageSchema = createInsertSchema(jobSupplyUsageTable).omit({ id: true, createdAt: true });
export type InsertJobSupplyUsage = z.infer<typeof insertJobSupplyUsageSchema>;
export type JobSupplyUsage = typeof jobSupplyUsageTable.$inferSelect;
