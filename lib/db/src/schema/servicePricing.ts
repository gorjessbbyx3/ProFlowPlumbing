import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicePricingTable = pgTable("service_pricing", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  basePrice: text("base_price").notNull(),
  unit: text("unit").default("per job"),
  durationEstimate: text("duration_estimate"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServicePricingSchema = createInsertSchema(servicePricingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServicePricing = z.infer<typeof insertServicePricingSchema>;
export type ServicePricing = typeof servicePricingTable.$inferSelect;
