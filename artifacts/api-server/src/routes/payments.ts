import { Router, type IRouter } from "express";
import { db, usersTable, paymentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth.js";

const router: IRouter = Router();

const PACK_CREDITS = 21;
const PACK_AMOUNT = "399.00";
const PACK_CURRENCY = "RUB";
const YOOKASSA_API = "https://api.yookassa.ru/v3/payments";
const FRONTEND_PATH = "/nutrition-coach/payment/success";

function yookassaAuth(): string {
  const shopId = process.env["YOOKASSA_SHOP_ID"];
  const secretKey = process.env["YOOKASSA_SECRET_KEY"];
  if (!shopId || !secretKey) return "";
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

/**
 * POST /payments/yookassa/create
 * Creates a YooKassa payment for 21 photo analysis credits (399 RUB).
 * Price is enforced server-side only.
 */
router.post("/payments/yookassa/create", requireAuth, async (req: AuthRequest, res) => {
  const auth = yookassaAuth();
  if (!auth) {
    req.log.error("YooKassa credentials (YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY) not configured");
    res.status(503).json({ error: "Платёжная система временно недоступна. Попробуйте позже." });
    return;
  }

  const appBaseUrl = (process.env["APP_BASE_URL"] ?? "").replace(/\/$/, "");
  const returnUrl = `${appBaseUrl}${FRONTEND_PATH}`;

  const [user] = await db
    .select({ id: usersTable.id, photoCredits: usersTable.photoCredits })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  const idempotenceKey = crypto.randomUUID();

  // Persist pending payment before calling YooKassa (prevents lost records)
  const [pending] = await db
    .insert(paymentsTable)
    .values({
      userId: user.id,
      idempotenceKey,
      status: "pending",
      credits: PACK_CREDITS,
      amountRub: PACK_AMOUNT,
    })
    .returning();

  const ykBody = {
    amount: { value: PACK_AMOUNT, currency: PACK_CURRENCY },
    capture: true,
    confirmation: { type: "redirect", return_url: returnUrl },
    description: `FitPlate Pack — ${PACK_CREDITS} анализов еды`,
    metadata: {
      userId: user.id,
      credits: PACK_CREDITS,
      product: "food_analyses_21",
      internalPaymentId: pending.id,
    },
  };

  let ykResp: Response;
  try {
    ykResp = await fetch(YOOKASSA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(ykBody),
    });
  } catch (err) {
    req.log.error({ err, userId: user.id }, "YooKassa network error");
    res.status(502).json({ error: "Ошибка соединения с платёжной системой. Попробуйте снова." });
    return;
  }

  if (!ykResp.ok) {
    const errText = await ykResp.text().catch(() => "");
    req.log.error({ status: ykResp.status, body: errText, userId: user.id }, "YooKassa rejected payment creation");
    res.status(502).json({ error: "Платёжная система вернула ошибку. Попробуйте снова." });
    return;
  }

  const ykData = (await ykResp.json()) as {
    id: string;
    confirmation: { confirmation_url: string };
  };

  // Update pending record with YooKassa payment ID
  await db
    .update(paymentsTable)
    .set({ yookassaPaymentId: ykData.id })
    .where(eq(paymentsTable.id, pending.id));

  req.log.info({ userId: user.id, yookassaPaymentId: ykData.id }, "YooKassa payment created");

  res.json({ confirmationUrl: ykData.confirmation.confirmation_url, paymentId: ykData.id });
});

/**
 * POST /payments/yookassa/webhook
 * Handles YooKassa event notifications. Idempotent.
 * On payment.succeeded: credits are added exactly once per payment.
 */
router.post("/payments/yookassa/webhook", async (req, res) => {
  const event = req.body as { event?: string; object?: { id?: string } };

  if (event.event !== "payment.succeeded") {
    // Acknowledge all other events immediately
    res.json({ ok: true });
    return;
  }

  const ykPaymentId = event.object?.id;
  if (!ykPaymentId) {
    res.status(400).json({ error: "Missing payment id in webhook body" });
    return;
  }

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.yookassaPaymentId, ykPaymentId))
    .limit(1);

  if (!payment) {
    // YooKassa can retry; log and return 200 to stop retries
    req.log.warn({ ykPaymentId }, "Webhook: payment record not found");
    res.json({ ok: true });
    return;
  }

  // Idempotency guard — already processed
  if (payment.status === "succeeded") {
    req.log.info({ ykPaymentId }, "Webhook: already processed, skipping");
    res.json({ ok: true });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, photoCredits: usersTable.photoCredits })
    .from(usersTable)
    .where(eq(usersTable.id, payment.userId))
    .limit(1);

  if (!user) {
    req.log.error({ ykPaymentId, userId: payment.userId }, "Webhook: user not found");
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Credit user and mark payment succeeded — both in the same logical step
  await db
    .update(usersTable)
    .set({ photoCredits: user.photoCredits + payment.credits })
    .where(eq(usersTable.id, user.id));

  await db
    .update(paymentsTable)
    .set({ status: "succeeded", processedAt: new Date() })
    .where(eq(paymentsTable.id, payment.id));

  req.log.info(
    { ykPaymentId, userId: user.id, addedCredits: payment.credits, newTotal: user.photoCredits + payment.credits },
    "Webhook: credits added",
  );

  res.json({ ok: true });
});

export default router;
