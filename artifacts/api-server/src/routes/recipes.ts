import { Router, type IRouter } from "express";
import { AnalyzeRecipeBody, AnalyzeRecipeResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const SYSTEM_PROMPT = `Ты — профессиональный шеф-повар и эксперт по питанию.

По одной фотографии готового блюда ты должен:
1. Точно определить блюдо.
2. Указать предполагаемый тип кухни.
3. Составить максимально точный, реально готовимый рецепт с граммовками ингредиентов, пошаговым приготовлением, общим временем готовки, сложностью, количеством порций и КБЖУ на одну порцию (калории, белки, жиры, углеводы).

ВАЖНО: ВСЕ текстовые поля ответа (название блюда, тип кухни, описание, ингредиенты, шаги, время, сложность, порции и единицы измерения) должны быть СТРОГО на русском языке. Не используй английский ни в одном поле.

Используй реалистичные кулинарные единицы измерения на русском (г, мл, ст. л., ч. л., стакан, шт.). Все числовые значения указывай вместе с единицами в виде строки. Шаги должны быть пронумерованными по смыслу, понятными и подробными.

Сложность указывай словами на русском: «лёгкая», «средняя» или «высокая».

Отвечай ТОЛЬКО одним JSON-объектом, строго соответствующим заданной схеме. Никакого дополнительного текста.

Если на фотографии НЕТ узнаваемого блюда (например, человек, пейзаж, пустое изображение или несъедобный объект), отвечай ТОЛЬКО так: {"error":"NO_DISH_DETECTED"}`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dishName",
    "cuisine",
    "description",
    "cookingTime",
    "difficulty",
    "servingSize",
    "ingredients",
    "steps",
    "nutrition",
  ],
  properties: {
    dishName: { type: "string" },
    cuisine: { type: "string" },
    description: { type: "string" },
    cookingTime: { type: "string" },
    difficulty: { type: "string" },
    servingSize: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantity"],
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
        },
      },
    },
    steps: {
      type: "array",
      items: { type: "string" },
    },
    nutrition: {
      type: "object",
      additionalProperties: false,
      required: ["calories", "protein", "fats", "carbs"],
      properties: {
        calories: { type: "string" },
        protein: { type: "string" },
        fats: { type: "string" },
        carbs: { type: "string" },
      },
    },
  },
} as const;

router.post("/recipes/analyze", async (req, res) => {
  const parsed = AnalyzeRecipeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Загрузите фотографию блюда, чтобы продолжить." });
    return;
  }

  const { imageBase64, mimeType } = parsed.data;

  if (!SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase())) {
    res.status(400).json({
      error: "Неподдерживаемый формат. Загрузите JPG, PNG, WEBP или GIF.",
    });
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
      max_completion_tokens: 8192,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AnalyzedRecipe",
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
              text: "Проанализируй это блюдо и верни JSON с рецептом строго на русском языке. Если на фото нет настоящего блюда, верни объект с ошибкой NO_DISH_DETECTED.",
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
      req.log.error({ completion }, "OpenAI returned empty response");
      res.status(500).json({ error: "ИИ не вернул результат. Попробуйте ещё раз." });
      return;
    }

    let jsonValue: unknown;
    try {
      jsonValue = JSON.parse(raw);
    } catch (err) {
      req.log.error({ err, raw }, "Failed to parse OpenAI JSON response");
      res
        .status(500)
        .json({ error: "Не удалось обработать ответ ИИ. Попробуйте ещё раз." });
      return;
    }

    if (
      typeof jsonValue === "object" &&
      jsonValue !== null &&
      "error" in jsonValue &&
      (jsonValue as { error?: unknown }).error === "NO_DISH_DETECTED"
    ) {
      res.status(422).json({
        error:
          "Не удалось распознать блюдо на этой фотографии. Попробуйте сделать более чёткое и хорошо освещённое фото готового блюда.",
      });
      return;
    }

    const validated = AnalyzeRecipeResponse.safeParse(jsonValue);
    if (!validated.success) {
      req.log.error(
        { issues: validated.error.issues, jsonValue },
        "OpenAI response did not match recipe schema",
      );
      res.status(500).json({
        error: "ИИ вернул неполный рецепт. Попробуйте ещё раз.",
      });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "OpenAI vision request failed");
    res.status(500).json({
      error: "Не удалось распознать блюдо прямо сейчас. Попробуйте через минуту.",
    });
  }
});

export default router;
