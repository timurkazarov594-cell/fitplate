import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalyzeFood, useCreateFoodEntry, getGetFoodEntriesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { CreditsWidget } from "@/components/credits-widget";

type Phase = "pick" | "loading" | "result" | "error" | "paywall";

interface AnalysisResult {
  dishName: string;
  ingredients: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  portionWeight: number;
}

async function compressImage(
  dataUrl: string,
  maxSizePx = 1280,
  quality = 0.85,
): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxSizePx || height > maxSizePx) {
        const scale = maxSizePx / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ dataUrl, mimeType: "image/jpeg" }); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), mimeType: "image/jpeg" });
    };
    img.onerror = () => resolve({ dataUrl, mimeType: "image/jpeg" });
    img.src = dataUrl;
  });
}

function extractErrorMessage(err: unknown): string {
  if (!err) return "Не удалось проанализировать блюдо. Попробуйте снова.";
  const e = err as Record<string, unknown>;
  const fromData = (e["data"] as Record<string, unknown> | undefined)?.["error"];
  if (typeof fromData === "string" && fromData) return fromData;
  if (typeof e["error"] === "string" && e["error"]) return e["error"] as string;
  if (typeof e["message"] === "string" && e["message"]) return e["message"] as string;
  return "Не удалось проанализировать блюдо. Попробуйте снова.";
}

function isNoCreditsError(err: unknown): boolean {
  const e = err as Record<string, unknown> | null | undefined;
  if (!e) return false;
  if ((e["status"] as number | undefined) === 402) return true;
  const fromData = (e["data"] as Record<string, unknown> | undefined)?.["error"];
  if (fromData === "NO_CREDITS") return true;
  if (e["error"] === "NO_CREDITS") return true;
  return false;
}

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const analyzeMutation = useAnalyzeFood();
  const createEntryMutation = useCreateFoodEntry();

  const today = new Date().toISOString().slice(0, 10);

  const startAnalysis = (compressedDataUrl: string, mimeType: string) => {
    if (!user) return;
    if (user.photoCredits <= 0) {
      setPhase("paywall");
      return;
    }

    const base64 = compressedDataUrl.split(",")[1] ?? "";
    if (!base64) {
      setErrorMsg("Не удалось прочитать файл. Попробуйте другое фото.");
      setPhase("error");
      return;
    }
    setPreviewUrl(compressedDataUrl);
    setPhase("loading");

    analyzeMutation.mutate(
      { data: { imageBase64: base64, mimeType } },
      {
        onSuccess: (data) => {
          setResult(data);
          setPhase("result");
          // Deduct 1 credit locally (backend already deducted it)
          updateUser({ ...user, photoCredits: Math.max(0, user.photoCredits - 1) });
        },
        onError: (err: unknown) => {
          if (isNoCreditsError(err)) {
            setPhase("paywall");
            return;
          }
          setErrorMsg(extractErrorMessage(err));
          setPhase("error");
        },
      },
    );
  };

  useEffect(() => {
    if (!user) return;
    if (user.photoCredits <= 0) {
      setPhase("paywall");
      return;
    }
    const pendingPhoto = sessionStorage.getItem("pendingFoodPhoto");
    const pendingType = sessionStorage.getItem("pendingFoodPhotoType");
    if (pendingPhoto && pendingType) {
      sessionStorage.removeItem("pendingFoodPhoto");
      sessionStorage.removeItem("pendingFoodPhotoType");
      startAnalysis(pendingPhoto, pendingType);
    }
  }, []);

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setErrorMsg("Можно загрузить только изображение (JPG, PNG, WEBP).");
      setPhase("error");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg("Файл слишком большой. Максимум 5 MB.");
      setPhase("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      try {
        const { dataUrl: compressed, mimeType } = await compressImage(rawDataUrl);
        startAnalysis(compressed, mimeType);
      } catch {
        setErrorMsg("Не удалось обработать изображение. Попробуйте другое фото.");
        setPhase("error");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Не удалось прочитать файл. Попробуйте другое фото.");
      setPhase("error");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file);
  };

  const handleAddToDiary = () => {
    if (!result || !user) return;
    createEntryMutation.mutate(
      {
        data: {
          date: today,
          dishName: result.dishName,
          ingredients: result.ingredients,
          calories: result.calories,
          protein: result.protein,
          fat: result.fat,
          carbs: result.carbs,
          fiber: result.fiber,
          portionWeight: result.portionWeight,
          imageUrl: previewUrl ?? undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFoodEntriesQueryKey({ date: today }) });
          queryClient.invalidateQueries({ queryKey: getGetFoodEntriesQueryKey({}) });
          setLocation("/dashboard");
        },
        onError: () => {
          setErrorMsg("Не удалось сохранить запись. Попробуйте снова.");
          setPhase("error");
        },
      },
    );
  };

  const reset = () => {
    setPhase("pick");
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg("");
  };

  if (!user) { setLocation("/"); return null; }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1">Анализ блюда</h1>
        <CreditsWidget />
      </div>

      <div className="flex-1 px-5 pb-8">
        <AnimatePresence mode="wait">

          {/* ── PICK ── */}
          {phase === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={handleInputChange}
              />
              <div
                role="button"
                tabIndex={0}
                className="w-full aspect-square max-h-72 bg-card border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors select-none"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">Нажмите, чтобы сфотографировать</p>
                  <p className="text-sm text-muted-foreground mt-1">или загрузить из галереи</p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP до 20 МБ</p>
                </div>
              </div>

              <div className="mt-4 bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-sm font-medium">
                  Осталось анализов:{" "}
                  <span className="text-primary font-bold">{user.photoCredits}</span>
                </p>
              </div>

              <div className="mt-3 bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Нейросеть определит блюдо и рассчитает КБЖУ на порцию. Результаты носят информационный характер.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {phase === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-6 pt-16">
              {previewUrl && (
                <div className="relative">
                  <img src={previewUrl} alt="preview" className="w-52 h-52 rounded-3xl object-cover" />
                  <div className="absolute inset-0 rounded-3xl bg-background/70 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                </div>
              )}
              <div className="text-center">
                <p className="font-semibold text-lg">Анализируем блюдо...</p>
                <p className="text-muted-foreground text-sm mt-1">Нейросеть считает КБЖУ</p>
              </div>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {phase === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {previewUrl && (
                <img src={previewUrl} alt={result.dishName} className="w-full h-56 rounded-3xl object-cover" />
              )}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{result.dishName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{result.portionWeight} г · {Math.round(result.calories)} ккал</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Калории", value: Math.round(result.calories), unit: "ккал", color: "text-primary" },
                    { label: "Белки",   value: Math.round(result.protein),  unit: "г",    color: "text-blue-400" },
                    { label: "Жиры",    value: Math.round(result.fat),      unit: "г",    color: "text-amber-400" },
                    { label: "Углеводы",value: Math.round(result.carbs),    unit: "г",    color: "text-violet-400" },
                  ].map((m) => (
                    <div key={m.label} className="bg-secondary rounded-xl p-3 text-center">
                      <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.unit}</p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Клетчатка: {Math.round(result.fiber)} г</p>
                <div>
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Ингредиенты</p>
                  <div className="flex flex-wrap gap-2">
                    {result.ingredients.map((ing) => (
                      <span key={ing} className="text-xs bg-secondary rounded-full px-3 py-1">{ing}</span>
                    ))}
                  </div>
                </div>
              </div>
              <Button className="w-full h-14 text-base font-medium rounded-xl" onClick={handleAddToDiary} disabled={createEntryMutation.isPending}>
                {createEntryMutation.isPending ? "Сохраняем..." : "Добавить в дневник"}
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-xl" onClick={reset}>
                Анализировать другое фото
              </Button>
            </motion.div>
          )}

          {/* ── PAYWALL ── */}
          {phase === "paywall" && (
            <motion.div key="paywall" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 pt-10 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl border border-primary/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">У вас закончились анализы</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Купите пакет, чтобы продолжить отслеживать питание
                </p>
                <p className="text-primary font-bold text-xl mt-4">21 анализ за 499 ₽</p>
              </div>
              <Button className="w-full h-14 text-base rounded-xl" onClick={() => setLocation("/payment")}>
                Купить 21 анализ за 499 ₽
              </Button>
              <button
                onClick={() => setLocation("/dashboard")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Вернуться на главную
              </button>
            </motion.div>
          )}

          {/* ── ERROR ── */}
          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6 pt-16 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Ошибка</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{errorMsg}</p>
              </div>
              <Button className="w-full h-14 rounded-xl" onClick={reset}>
                Попробовать снова
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function creditsLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "анализ";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "анализа";
  return "анализов";
}
