import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { partnersTable } from "./partners";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  gender: text("gender").notNull().default("male"),
  age: integer("age").notNull().default(25),
  height: integer("height").notNull().default(170),
  weight: real("weight").notNull().default(70),
  goal: text("goal").notNull().default("maintain"),
  activity: text("activity").notNull().default("low"),
  targetCalories: integer("target_calories").notNull().default(2000),
  targetProtein: integer("target_protein").notNull().default(120),
  targetFat: integer("target_fat").notNull().default(55),
  targetCarbs: integer("target_carbs").notNull().default(230),
  targetFiber: integer("target_fiber").notNull().default(25),
  isPremium: boolean("is_premium").notNull().default(false),
  freeAnalysesUsed: integer("free_analyses_used").notNull().default(0),
  freeAnalysisUsed: boolean("free_analysis_used").notNull().default(false),
  photoCredits: integer("photo_credits").notNull().default(0),
  referredByPartnerId: integer("referred_by_partner_id").references(() => partnersTable.id, { onDelete: "set null" }),
  referredByCode: text("referred_by_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
