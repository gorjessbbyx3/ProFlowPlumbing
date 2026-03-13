import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { bookingsTable } from "./bookings";

export const laborEntriesTable = pgTable("labor_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookingsTable.id, { onDelete: "set null" }),
  date: text("date").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  totalPay: numeric("total_pay", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLaborEntrySchema = createInsertSchema(laborEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLaborEntry = z.infer<typeof insertLaborEntrySchema>;
export type LaborEntry = typeof laborEntriesTable.$inferSelect;
