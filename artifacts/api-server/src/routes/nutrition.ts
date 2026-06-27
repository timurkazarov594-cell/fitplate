import { Router, type IRouter } from "express";
import { AnalyzeFoodBody, AnalyzeFoodResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth.js";

const router: IRouter = Router();

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

// 5 MB expressed as max base64 string length: ceil(5*1024*1024 / 3) * 4
const MAX_BASE64_LENGTH = 6_990_508;

const SYSTEM_PROMPT = `Ты — система безопасности и диетолог.

ШАГ 1 — Проверка контента:
Посмотри на изображение и определи его тип:
- Если на фото насилие, кровь, травмы, расчленение, интимный или сексуальный контент, несовершеннолетние в неподходящем контексте, незаконный контент или любое другое опасное/запрещённое содержимое — отвечай ТОЛЬКО: {"error":"FORBIDDEN_CONTENT"}
- Если на фото нет еды (только люди, пейзажи, животные без еды, предметы, части тела без еды) — отвечай ТОЛЬКО: {"error":"NO_FOOD_DETECTED"}
- Если на фото рука или руки, держащие блюдо или еду — это допустимо, продолжай анализ.

ШАГ 2 — Анализ блюда (только если на фото есть еда и нет запрещённого контента):
Определи:
1. Название блюда на русском языке.
2. Список основных видимых ингредиентов на русском языке (максимум 8).
3. Примерный вес порции в граммах.
4. КБЖУ на данную порцию: калории (ккал), белки (г), жиры (г), углеводы (г), клетчатка (г).

ВАЖНО: Все текстовые поля строго на русском языке. Указывай реалистичные значения КБЖУ.

Отвечай ТОЛЬКО одним JSON-объектом. Никакого дополнительного текста.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dishName", "ingredients", "calories", "protein", "fat", "carbs", "fiber", "portionWeight"],
  properties: {
    dishName: { type: "string" },
    ingredients: { type: "array", items: { type: "string" } },
    calories: { type: "number" },
    protein: { type: "number" },
    fat: { type: "number" },
    carbs: { type: "number" },
    fiber: { type: "number" },
    portionWeight: { type: "number" },
  },
} as const;

router.post("/nutrition/analyze", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Пользователь не найден." });
    return;
  }

  // Access control: require at least 1 photoCredit
  if (user.photoCredits <= 0) {
    req.log.info({ userId: user.id }, "No photo credits remaining");
    res.status(402).json({ error: "NO_CREDITS" });
    return;
  }

  const parsed = AnalyzeFoodBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Загрузите фотографию блюда, чтобы продолжить." });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;

  // Backend: validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    res.status(400).json({ error: "Можно загрузить только изображение (JPG, PNG, WEBP)." });
    return;
  }

  // Backend: validate file size (base64 length → original bytes)
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    res.status(413).json({ error: "Файл слишком большой. Максимум 5 MB." });
    return;
  }

  if (imageBase64.length < 100) {
    res.status(400).json({ error: "Загруженное изображение пустое или повреждено." });
    return;
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "FoodAnalysis",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Проверь изображение на запрещённый контент, затем если это еда — верни JSON с КБЖУ на русском языке.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      // Do NOT log the image; log only the model response status
      req.log.error({ userId: user.id }, "OpenAI returned empty response");
      res.status(500).json({ error: "ИИ не вернул результат. Попробуйте ещё раз." });
      return;
    }

    let jsonValue: unknown;
    try {
      jsonValue = JSON.parse(raw);
    } catch {
      req.log.error({ userId: user.id, rawLength: raw.length }, "Failed to parse OpenAI JSON response");
      res.status(500).json({ error: "Не удалось обработать ответ ИИ. Попробуйте ещё раз." });
      return;
    }

    const errorCode =
      typeof jsonValue === "object" &&
      jsonValue !== null &&
      "error" in jsonValue
        ? (jsonValue as { error?: unknown }).error
        : null;

    // Forbidden content — DO NOT deduct credit
    if (errorCode === "FORBIDDEN_CONTENT") {
      req.log.warn({ userId: user.id }, "Forbidden content detected, credit not deducted");
      res.status(422).json({ error: "Это изображение нельзя обработать." });
      return;
    }

    // Not food — DO NOT deduct credit
    if (errorCode === "NO_FOOD_DETECTED") {
      req.log.info({ userId: user.id }, "No food detected, credit not deducted");
      res.status(422).json({ error: "Пожалуйста, загрузите фотографию блюда." });
      return;
    }

    const validated = AnalyzeFoodResponse.safeParse(jsonValue);
    if (!validated.success) {
      req.log.error({ userId: user.id, issues: validated.error.issues }, "OpenAI response schema mismatch");
      res.status(500).json({ error: "ИИ вернул неполные данные. Попробуйте ещё раз." });
      return;
    }

    // Deduct 1 credit ONLY on successful food analysis
    await db
      .update(usersTable)
      .set({ photoCredits: user.photoCredits - 1 })
      .where(eq(usersTable.id, user.id));

    req.log.info({ userId: user.id, creditsRemaining: user.photoCredits - 1 }, "Photo credit deducted");

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err, userId: user.id }, "OpenAI nutrition vision request failed");
    res.status(500).json({ error: "Не удалось проанализировать блюдо прямо сейчас. Попробуйте через минуту." });
  }
});

export default router;
