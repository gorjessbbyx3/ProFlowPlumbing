import { pgTable, text, serial, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "pipes_fittings" | "plumbing_tools" | "fixtures" | "sealants_adhesives"
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull().default("units"), // units, bottles, boxes, rolls, etc.
  minStock: integer("min_stock").default(0),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  supplier: text("supplier"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;
