import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetFoodEntries, getGetFoodEntriesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { CreditsWidget } from "@/components/credits-widget";

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

/* ─── helpers ─────────────────────────────────────────── */
function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min((current / (target || 1)) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(current)} / {target} г</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function getAiTip(todayCals: number, targetCals: number, goal: string, protein: number, targetProtein: number): string {
  const diff = Math.round(todayCals - targetCals);
  const proteinLeft = Math.max(0, Math.round(targetProtein - protein));
  if (diff > 100)
    return `Сегодня перебор на ${diff} ккал. Завтра рекомендуется съесть примерно на ${diff} ккал меньше.`;
  if (goal === "gain" && diff < -150)
    return `Дефицит ${Math.abs(diff)} ккал. Для набора массы добавьте${proteinLeft > 5 ? ` ${proteinLeft} г белка и` : ""} ещё ${Math.abs(diff)} ккал.`;
  if (goal === "loss" && diff < -100)
    return `Дефицит ${Math.abs(diff)} ккал — отлично для похудения!`;
  if (proteinLeft > 15)
    return `Осталось добавить ${proteinLeft} г белка. Подойдут: куриная грудка, творог или тунец.`;
  return "Отличный баланс! Продолжайте в том же темпе.";
}

/* ─── week balance block ───────────────────────────────── */
function WeekBalance({ allEntries, targetCals, goal }: {
  allEntries: { date: string; calories: number }[];
  targetCals: number;
  goal: string;
}) {
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = getDateStr(6 - i);
    const cals = allEntries.filter((e) => e.date === date).reduce((s, e) => s + e.calories, 0);
    return { date, cals: Math.round(cals) };
  });

  const weekConsumed = last7.reduce((s, d) => s + d.cals, 0);
  const weekNorm     = targetCals * 7;
  const weekDiff     = weekConsumed - weekNorm;
  const weekPct      = weekNorm ? Math.round((weekConsumed / weekNorm) * 100) : 0;

  const todayCals = last7[last7.length - 1].cals;
  const todayDiff = Math.round(todayCals - targetCals);

  let tomorrowTip = "";
  if (todayDiff > 100)
    tomorrowTip = `Сегодня +${todayDiff} ккал. Завтра рекомендуется на ${todayDiff} ккал меньше.`;
  else if (goal === "gain" && todayDiff < -100)
    tomorrowTip = `Сегодня −${Math.abs(todayDiff)} ккал. Для набора массы завтра добавьте ~${Math.abs(todayDiff)} ккал.`;
  else if (goal === "loss" && todayDiff < -100)
    tomorrowTip = `Дефицит ${Math.abs(todayDiff)} ккал — отличный результат для похудения!`;
  else
    tomorrowTip = "Вы точно в норме сегодня. Так держать!";

  return (
    <div className="mx-5 mb-4 bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Баланс недели</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          weekDiff > 200 ? "bg-red-400/15 text-red-400" :
          weekDiff < -200 ? "bg-amber-400/15 text-amber-400" :
          "bg-emerald-400/15 text-emerald-400"
        }`}>
          {weekDiff > 0 ? "+" : ""}{weekDiff.toLocaleString("ru")} ккал
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{weekConsumed.toLocaleString("ru")} из {weekNorm.toLocaleString("ru")} ккал</span>
          <span>{weekPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${weekPct > 115 ? "bg-red-400" : weekPct < 80 ? "bg-amber-400" : "bg-emerald-400"}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(weekPct, 100)}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/10 rounded-xl px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-primary font-medium">Рекомендация: </span>
          {tomorrowTip}
        </p>
      </div>
    </div>
  );
}

/* ─── main ─────────────────────────────────────────────── */
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  const openFilePicker = () => {
    if (!user) return;
    if (user.photoCredits <= 0) {
      setLocation("/payment");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      try {
        const { dataUrl, mimeType } = await compressImage(rawDataUrl);
        sessionStorage.setItem("pendingFoodPhoto", dataUrl);
        sessionStorage.setItem("pendingFoodPhotoType", mimeType);
      } catch {
        sessionStorage.setItem("pendingFoodPhoto", rawDataUrl);
        sessionStorage.setItem("pendingFoodPhotoType", file.type || "image/jpeg");
      }
      setLocation("/analyze");
    };
    reader.onerror = () => setLocation("/analyze");
    reader.readAsDataURL(file);
  };

  const { data: todayEntries = [], isLoading } = useGetFoodEntries(
    { date: today },
    { query: { enabled: !!user, queryKey: getGetFoodEntriesQueryKey({ date: today }) } }
  );
  const { data: allEntries = [] } = useGetFoodEntries(
    {},
    { query: { enabled: !!user, queryKey: getGetFoodEntriesQueryKey({}) } }
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (!user) setLocation("/");
  }, [user, setLocation]);

  if (!user) return null;

  const totalCals    = todayEntries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = todayEntries.reduce((s, e) => s + e.protein,  0);
  const totalFat     = todayEntries.reduce((s, e) => s + e.fat,      0);
  const totalCarbs   = todayEntries.reduce((s, e) => s + e.carbs,    0);
  const totalFiber   = todayEntries.reduce((s, e) => s + e.fiber,    0);
  const calPct       = Math.min((totalCals / user.targetCalories) * 100, 100);

  const goalLabel: Record<string, string> = { loss: "Похудение", maintain: "Поддержание", gain: "Набор массы" };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-24">

      {/* ── Header ── */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Привет, {user.name}</p>
            <h1 className="text-2xl font-bold">Дневник питания</h1>
          </div>
          <div className="flex items-center gap-2">
            <CreditsWidget />
            <button
              onClick={() => setLocation("/settings")}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Calorie Ring ── */}
      <div className="px-5 mb-4">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <motion.circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke={totalCals > user.targetCalories * 1.1 ? "#f87171" : "hsl(var(--primary))"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - calPct / 100) }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold leading-none">{Math.round(totalCals)}</span>
                <span className="text-[10px] text-muted-foreground">ккал</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Цель</span>
                <span className="text-sm font-medium">{user.targetCalories} ккал</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Осталось</span>
                <span className={`text-sm font-medium ${totalCals > user.targetCalories ? "text-red-400" : "text-primary"}`}>
                  {totalCals > user.targetCalories
                    ? `+${Math.round(totalCals - user.targetCalories)} перебор`
                    : `${Math.max(0, user.targetCalories - Math.round(totalCals))} ккал`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Режим</span>
                <span className="text-xs font-medium text-muted-foreground">{goalLabel[user.goal]}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <MacroBar label="Белки"     current={totalProtein} target={user.targetProtein} color="bg-blue-400" />
            <MacroBar label="Жиры"      current={totalFat}     target={user.targetFat}     color="bg-amber-400" />
            <MacroBar label="Углеводы"  current={totalCarbs}   target={user.targetCarbs}   color="bg-violet-400" />
            <MacroBar label="Клетчатка" current={totalFiber}   target={user.targetFiber}   color="bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* ── Week Balance ── */}
      {allEntries.length > 0 && (
        <WeekBalance allEntries={allEntries} targetCals={user.targetCalories} goal={user.goal} />
      )}

      {/* ── AI Tip ── */}
      {todayEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mb-4 bg-primary/10 border border-primary/20 rounded-2xl p-4"
        >
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getAiTip(totalCals, user.targetCalories, user.goal, totalProtein, user.targetProtein)}
            </p>
          </div>
        </motion.div>
      )}

      {/* Shared hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileSelect}
      />

      {/* ── Today's meals ── */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Приёмы пищи сегодня</h2>
          <button onClick={() => setLocation("/history")} className="text-xs text-primary">История</button>
        </div>

        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todayEntries.length === 0 ? (
          <button
            onClick={openFilePicker}
            className="w-full bg-card border border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">Нажмите, чтобы сфотографировать или загрузить блюдо</p>
          </button>
        ) : (
          <div className="space-y-3">
            {todayEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
              >
                {entry.imageUrl ? (
                  <img src={entry.imageUrl} alt={entry.dishName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.dishName}</p>
                  <p className="text-xs text-muted-foreground">{entry.portionWeight} г</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-primary font-medium">{Math.round(entry.calories)} ккал</span>
                    <span className="text-xs text-muted-foreground">Б {Math.round(entry.protein)}г</span>
                    <span className="text-xs text-muted-foreground">Ж {Math.round(entry.fat)}г</span>
                    <span className="text-xs text-muted-foreground">У {Math.round(entry.carbs)}г</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around px-4 py-3">
          <button className="flex flex-col items-center gap-1 text-primary">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            <span className="text-[10px] font-medium">Главная</span>
          </button>
          <button onClick={() => setLocation("/history")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <span className="text-[10px]">История</span>
          </button>
          <button
            onClick={openFilePicker}
            className="w-16 h-16 -mt-6 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <svg className="w-7 h-7 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button onClick={() => setLocation("/stats")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[10px]">Статистика</span>
          </button>
          <button onClick={() => setLocation("/settings")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px]">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  );
}
