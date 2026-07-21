import { Router, type IRouter } from "express";
import { db, foodEntriesTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { CreateFoodEntryBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth.js";

const router: IRouter = Router();

router.get("/food-entries", requireAuth, async (req: AuthRequest, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : null;

  let rows;
  if (date) {
    rows = await db.select().from(foodEntriesTable)
      .where(and(eq(foodEntriesTable.userId, req.userId!), eq(foodEntriesTable.date, date)))
      .orderBy(foodEntriesTable.createdAt);
  } else {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const minDate = thirtyDaysAgo.toISOString().slice(0, 10);
    rows = await db.select().from(foodEntriesTable)
      .where(and(eq(foodEntriesTable.userId, req.userId!), gte(foodEntriesTable.date, minDate)))
      .orderBy(foodEntriesTable.createdAt);
  }

  res.json(rows);
});

router.post("/food-entries", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateFoodEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Проверьте данные записи." });
    return;
  }

  const [entry] = await db.insert(foodEntriesTable).values({
    userId: req.userId!,
    ...parsed.data,
    imageUrl: parsed.data.imageUrl ?? null,
  }).returning();

  res.status(201).json(entry);
});

export default router;
