import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody, UpdateProfileBody } from "@workspace/api-zod";
import { signToken, calculateTargets } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth.js";

const router: IRouter = Router();

const PACK_CREDITS = 21;

function toPublic(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    gender: user.gender,
    age: user.age,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    activity: user.activity,
    targetCalories: user.targetCalories,
    targetProtein: user.targetProtein,
    targetFat: user.targetFat,
    targetCarbs: user.targetCarbs,
    targetFiber: user.targetFiber,
    photoCredits: user.photoCredits,
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Проверьте введённые данные." });
    return;
  }
  const { email, name, password, ...profile } = parsed.data;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Этот email уже зарегистрирован." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const targets = calculateTargets(profile);

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    name,
    passwordHash,
    gender: profile.gender,
    age: profile.age,
    height: profile.height,
    weight: profile.weight,
    goal: profile.goal,
    activity: profile.activity,
    ...targets,
    photoCredits: 1,
  }).returning();

  const token = signToken(user.id);
  res.status(201).json({ token, user: toPublic(user) });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Введите email и пароль." });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Неверный email или пароль." });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Неверный email или пароль." });
    return;
  }

  const token = signToken(user.id);
  res.json({ token, user: toPublic(user) });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }
  res.json(toPublic(user));
});

router.patch("/auth/profile", requireAuth, async (req: AuthRequest, res) => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Проверьте введённые данные." });
    return;
  }

  const [current] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!current) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  const merged = { ...current, ...parsed.data };
  const targets = calculateTargets(merged);

  const [updated] = await db.update(usersTable)
    .set({ ...parsed.data, ...targets })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json(toPublic(updated));
});

/**
 * Purchase a photo analysis pack (+21 photoCredits).
 * Currently a mock — replace with real YooKassa payment verification:
 * 1. Initiate payment via YooKassa API
 * 2. On confirmed payment webhook/redirect, call this endpoint
 */
router.post("/auth/purchase-pack", requireAuth, async (req: AuthRequest, res) => {
  const [current] = await db.select({ photoCredits: usersTable.photoCredits })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  if (!current) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  const [updated] = await db.update(usersTable)
    .set({ photoCredits: current.photoCredits + PACK_CREDITS })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  req.log.info({ userId: req.userId, newCredits: updated.photoCredits }, "Photo pack purchased");
  res.json(toPublic(updated));
});

export default router;
