import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  yookassaPaymentId: text("yookassa_payment_id").unique(),
  idempotenceKey: text("idempotence_key").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | succeeded | cancelled
  credits: integer("credits").notNull().default(21),
  amountRub: text("amount_rub").notNull().default("399.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type Payment = typeof paymentsTable.$inferSelect;
