import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAnalyzeRecipe, type AnalyzedRecipe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";

// Anonymous, single-use trial: one photo analysis before registration is
// required. Tracked client-side only via localStorage — the backend
// endpoint used here (/api/recipes/analyze) already requires no auth and
// is untouched by this flag.
const TRIAL_USED_KEY = "nc_trial_used";

type TrialPhase = "intro" | "loading" | "result" | "locked" | "error";

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
  const e = err as Record<string, unknown> | null | undefined;
  const fromData = (e?.["data"] as Record<string, unknown> | undefined)?.["error"];
  if (typeof fromData === "string" && fromData) return fromData;
  if (typeof e?.["message"] === "string" && e["message"]) return e["message"] as string;
  return "Не удалось проанализировать фото. Попробуйте снова.";
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trialUsed, setTrialUsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(TRIAL_USED_KEY) === "1",
  );
  const [phase, setPhase] = useState<TrialPhase>("intro");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedRecipe | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const analyzeMutation = useAnalyzeRecipe();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const openTrialPicker = () => {
    if (trialUsed) {
      setPhase("locked");
      return;
    }
    fileInputRef.current?.click();
  };

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

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
      let compressed: string;
      let mimeType: string;
      try {
        const out = await compressImage(rawDataUrl);
        compressed = out.dataUrl;
        mimeType = out.mimeType;
      } catch {
        setErrorMsg("Не удалось обработать изображение. Попробуйте другое фото.");
        setPhase("error");
        return;
      }

      const base64 = compressed.split(",")[1] ?? "";
      if (!base64) {
        setErrorMsg("Не удалось прочитать файл. Попробуйте другое фото.");
        setPhase("error");
        return;
      }

      setPreviewUrl(compressed);
      setPhase("loading");

      analyzeMutation.mutate(
        { data: { imageBase64: base64, mimeType } },
        {
          onSuccess: (data) => {
            setResult(data);
            setPhase("result");
            localStorage.setItem(TRIAL_USED_KEY, "1");
            setTrialUsed(true);
          },
          onError: (err: unknown) => {
            setErrorMsg(extractErrorMessage(err));
            setPhase("error");
          },
        },
      );
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

  const resetTrial = () => {
    setPhase(trialUsed ? "locked" : "intro");
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={handleInputChange}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-3">
          Fit<span className="text-primary">Plate</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-[280px] mx-auto mb-8">
          Фотографируй еду. Контролируй питание.
        </p>

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">

            {phase === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openTrialPicker}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openTrialPicker(); }}
                  className="w-full bg-card border-2 border-dashed border-primary/30 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors select-none text-left"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Попробовать бесплатно</p>
                    <p className="text-xs text-muted-foreground mt-0.5">1 анализ фото — без регистрации</p>
                  </div>
                </div>
              </motion.div>
            )}

            {phase === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4">
                {previewUrl && (
                  <div className="relative">
                    <img src={previewUrl} alt="preview" className="w-32 h-32 rounded-2xl object-cover" />
                    <div className="absolute inset-0 rounded-2xl bg-background/70 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                      />
                    </div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Анализируем блюдо...</p>
              </motion.div>
            )}

            {phase === "result" && result && (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-left space-y-3">
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {previewUrl && (
                      <img src={previewUrl} alt={result.dishName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{result.dishName}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.cuisine}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Калории", value: result.nutrition.calories },
                      { label: "Белки", value: result.nutrition.protein },
                      { label: "Жиры", value: result.nutrition.fats },
                      { label: "Углеводы", value: result.nutrition.carbs },
                    ].map((m) => (
                      <div key={m.label} className="bg-secondary rounded-xl p-2 text-center">
                        <p className="text-sm font-bold">{m.value}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
                  <p className="text-sm font-medium">Понравилось?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Зарегистрируйтесь, чтобы сохранять анализы в дневник и получить больше проверок блюд
                  </p>
                </div>
              </motion.div>
            )}

            {phase === "locked" && (
              <motion.div key="locked" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="font-semibold text-sm">Бесплатный анализ уже использован</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Зарегистрируйтесь или войдите, чтобы анализировать блюда дальше
                </p>
              </motion.div>
            )}

            {phase === "error" && (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 text-center">
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
                {!trialUsed && (
                  <button onClick={resetTrial} className="text-xs text-primary mt-2 font-medium">
                    Попробовать снова
                  </button>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <div className="w-full max-w-sm mt-8 pb-8 space-y-3">
          <Button
            className="w-full h-14 text-lg font-medium rounded-xl"
            onClick={() => setLocation("/register")}
          >
            Начать — это бесплатно
          </Button>
          <button
            onClick={() => setLocation("/login")}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      </div>
    </div>
  );
}
