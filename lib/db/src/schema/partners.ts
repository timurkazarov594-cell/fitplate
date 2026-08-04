import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const partnersTable = pgTable("partners", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Partner = typeof partnersTable.$inferSelect;
