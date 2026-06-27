import { pgTable, text, serial, integer, real, timestamp, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const foodEntriesTable = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  dishName: text("dish_name").notNull(),
  ingredients: json("ingredients").notNull().$type<string[]>(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  fat: real("fat").notNull(),
  carbs: real("carbs").notNull(),
  fiber: real("fiber").notNull(),
  portionWeight: real("portion_weight").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntriesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
export type FoodEntry = typeof foodEntriesTable.$inferSelect;
