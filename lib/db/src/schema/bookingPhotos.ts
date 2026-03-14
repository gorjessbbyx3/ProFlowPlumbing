import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const bookingPhotosTable = pgTable("booking_photos", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookingsTable.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // "before" | "after"
  filePath: text("file_path").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingPhotoSchema = createInsertSchema(bookingPhotosTable).omit({ id: true, createdAt: true });
export type InsertBookingPhoto = z.infer<typeof insertBookingPhotoSchema>;
export type BookingPhoto = typeof bookingPhotosTable.$inferSelect;
