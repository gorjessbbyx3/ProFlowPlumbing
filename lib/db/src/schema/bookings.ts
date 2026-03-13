import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { employeesTable } from "./employees";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  employeeId: integer("employee_id").references(() => employeesTable.id, { onDelete: "set null" }),
  serviceType: text("service_type").notNull(),
  status: text("status").notNull().default("scheduled"),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location"),
  notes: text("notes"),
  estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
