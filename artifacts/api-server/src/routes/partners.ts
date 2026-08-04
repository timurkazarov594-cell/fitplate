import { Router, type IRouter } from "express";
import { db, partnersTable, usersTable, paymentsTable, partnerLinkClicksTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { LoginPartnerBody, TrackPartnerReferralClickBody } from "@workspace/api-zod";
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
    res.status(401).json({ error: "Неверный код партнёра." });
    return;
  }

  // TEMPORARY (owner request, 2026): password check disabled — login is code-only for testing.
  // To reinstate: `if (!(await bcrypt.compare(parsed.data.password ?? "", partner.passwordHash))) { ...401... }`

  const token = signPartnerToken(partner.id);
  res.json({ token, partner: { id: partner.id, code: partner.code, name: partner.name } });
});

// Fire-and-forget analytics beacon: called by the frontend whenever a page loads
// with ?ref=CODE, before the visitor has registered. Always acks — unknown codes
// aren't reported as errors, so this endpoint can't be used to probe valid codes.
router.post("/partners/track-click", async (req, res) => {
  const parsed = TrackPartnerReferralClickBody.safeParse(req.body);
  if (!parsed.success) {
    res.json({ ok: true });
    return;
  }
  const code = parsed.data.code.trim().toUpperCase();

  const [partner] = await db.select({ id: partnersTable.id }).from(partnersTable)
    .where(and(eq(partnersTable.code, code), eq(partnersTable.isActive, true)))
    .limit(1);

  if (partner) {
    await db.insert(partnerLinkClicksTable).values({ partnerId: partner.id });
  }

  res.json({ ok: true });
});

router.get("/partners/me/stats", requirePartnerAuth, async (req: PartnerAuthRequest, res) => {
  const [partner] = await db.select().from(partnersTable).where(eq(partnersTable.id, req.partnerId!)).limit(1);
  if (!partner) {
    res.status(404).json({ error: "Партнёр не найден." });
    return;
  }

  const clicks = await db.select({ id: partnerLinkClicksTable.id }).from(partnerLinkClicksTable)
    .where(eq(partnerLinkClicksTable.partnerId, partner.id));

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
    clicksCount: clicks.length,
    registrationsCount: registrations.length,
    paymentsCount: succeededPayments.length,
    paymentsSumRub: paymentsSumRub.toFixed(2),
    commissionSumRub: commissionSumRub.toFixed(2),
  });
});

export default router;
