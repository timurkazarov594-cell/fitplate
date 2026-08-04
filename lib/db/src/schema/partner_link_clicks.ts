import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { partnersTable } from "./partners";

export const partnerLinkClicksTable = pgTable("partner_link_clicks", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => partnersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerLinkClick = typeof partnerLinkClicksTable.$inferSelect;
