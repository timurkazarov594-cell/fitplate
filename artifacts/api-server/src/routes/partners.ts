import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, partnersTable, usersTable, paymentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { LoginPartnerBody } from "@workspace/api-zod";
import { signPartnerToken } from "../lib/auth.js";
import { requirePartnerAuth, type PartnerAuthRequest } from "../middlewares/requirePartnerAuth.js";

const router: IRouter = Router();

router.post("/partners/login", async (req, res) => {
  const parsed = LoginPartnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Проверьте введённые данные." });
    return;
  }
  const code = parsed.data.code.trim().toUpperCase();

  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.code, code)).limit(1);
  if (!partner || !partner.isActive) {
    res.status(401).json({ error: "Неверный код или пароль." });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, partner.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Неверный код или пароль." });
    return;
  }

  const token = signPartnerToken(partner.id);
  res.json({ token, partner: { id: partner.id, code: partner.code, name: partner.name } });
});

router.get("/partners/me/stats", requirePartnerAuth, async (req: PartnerAuthRequest, res) => {
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, req.partnerId!)).limit(1);
  if (!partner) {
    res.status(404).json({ error: "Партнёр не найден." });
    return;
  }

  const registrations = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.referredByPartnerId, partner.id));

  const succeededPayments = await db.select({
    amountRub: paymentsTable.amountRub,
    commissionRub: paymentsTable.commissionRub,
  }).from(paymentsTable)
    .where(and(eq(paymentsTable.partnerId, partner.id), eq(paymentsTable.status, "succeeded")));

  const paymentsSumRub = succeededPayments.reduce((sum, p) => sum + parseFloat(p.amountRub), 0);
  const commissionSumRub = succeededPayments.reduce((sum, p) => sum + parseFloat(p.commissionRub ?? "0"), 0);

  res.json({
    code: partner.code,
    name: partner.name,
    registrationsCount: registrations.length,
    paymentsCount: succeededPayments.length,
    paymentsSumRub: paymentsSumRub.toFixed(2),
    commissionSumRub: commissionSumRub.toFixed(2),
  });
});

export default router;
