import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { useGetFoodEntries, getGetFoodEntriesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";

/* ─── helpers ─────────────────────────────────────────── */
function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MONTH_RU   = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function fmtDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAY_RU[d.getDay()]}, ${d.getDate()} ${MONTH_RU[d.getMonth()]}`;
}
function fmtShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${WEEKDAY_RU[d.getDay()]} ${d.getDate()}`;
}

type DayStatus = "normal" | "under" | "over" | "empty";

function dayStatus(cals: number, target: number, goal: string): DayStatus {
  if (cals === 0) return "empty";
  const ratio = cals / target;
  if (goal === "loss") {
    if (ratio > 1.1) return "over";
    if (ratio < 0.7) return "under";
    return "normal";
  }
  if (goal === "gain") {
    if (ratio < 0.85) return "under";
    if (ratio > 1.2)  return "over";
    return "normal";
  }
  // maintain
  if (ratio > 1.15) return "over";
  if (ratio < 0.85) return "under";
  return "normal";
}

const STATUS_EMOJI: Record<DayStatus, string> = {
  normal: "🟢",
  under:  "🟡",
  over:   "🔴",
  empty:  "⚪",
};
const STATUS_LABEL: Record<DayStatus, string> = {
  normal: "В норме",
  under:  "Недобор",
  over:   "Перебор",
  empty:  "Нет данных",
};
const STATUS_COLOR: Record<DayStatus, string> = {
  normal: "text-emerald-400",
  under:  "text-amber-400",
  over:   "text-red-400",
  empty:  "text-muted-foreground",
};
const BAR_FILL: Record<DayStatus, string> = {
  normal: "#34d399",
  under:  "#fbbf24",
  over:   "#f87171",
  empty:  "#374151",
};

/* ─── smart compensation copy ──────────────────────────── */
function getCompensationTip(
  todayCals: number,
  targetCals: number,
  goal: string,
  targetProtein: number,
  todayProtein: number,
): string {
  const diff = Math.round(todayCals - targetCals);
  const proteinShort = Math.round(targetProtein - todayProtein);

  if (goal === "loss") {
    if (diff > 100)
      return `Сегодня перебор на ${diff} ккал. Завтра рекомендуется съесть примерно на ${diff} ккал меньше или добавить физическую активность.`;
    if (diff < -200)
      return `Сегодня дефицит ${Math.abs(diff)} ккал — отлично для похудения! Продолжайте в том же духе.`;
    return "Сегодня вы точно в норме. Так держать!";
  }
  if (goal === "gain") {
    if (diff < -100)
      return `Сегодня дефицит ${Math.abs(diff)} ккал. Для набора массы завтра рекомендуется увеличить рацион на ${Math.abs(diff)} ккал${proteinShort > 5 ? ` и добавить ${proteinShort} г белка` : ""}.`;
    if (diff > 300)
      return `Сегодня перебор на ${diff} ккал. Если это не тренировочный день, постарайтесь завтра вернуться к норме.`;
    return "Сегодня отличный баланс для набора массы!";
  }
  // maintain
  if (diff > 100)
    return `Сегодня перебор на ${diff} ккал. Завтра рекомендуется съесть примерно на ${diff} ккал меньше.`;
  if (diff < -100)
    return `Сегодня дефицит ${Math.abs(diff)} ккал. Завтра можно добавить ${Math.abs(diff)} ккал для поддержания нормы.`;
  return "Сегодня вы точно в норме. Отличная работа!";
}

/* ─── component ────────────────────────────────────────── */
export default function Stats() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: allEntries = [], isLoading } = useGetFoodEntries(
    {},
    { query: { enabled: !!user, queryKey: getGetFoodEntriesQueryKey({}) } }
  );

  if (!user) { setLocation("/"); return null; }

  /* Build last-7 day rows */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date   = getDateStr(6 - i);
    const day    = allEntries.filter((e) => e.date === date);
    const cals   = day.reduce((s, e) => s + e.calories, 0);
    const protein= day.reduce((s, e) => s + e.protein,  0);
    const fat    = day.reduce((s, e) => s + e.fat,      0);
    const carbs  = day.reduce((s, e) => s + e.carbs,    0);
    const fiber  = day.reduce((s, e) => s + e.fiber,    0);
    const status = dayStatus(cals, user.targetCalories, user.goal);
    return {
      date,
      label:   fmtDay(date),
      short:   fmtShort(date),
      cals:    Math.round(cals),
      protein: Math.round(protein),
      fat:     Math.round(fat),
      carbs:   Math.round(carbs),
      fiber:   Math.round(fiber),
      status,
    };
  });

  /* Weekly totals */
  const weekConsumed = last7.reduce((s, d) => s + d.cals, 0);
  const weekNorm     = user.targetCalories * 7;
  const weekDiff     = weekConsumed - weekNorm;
  const weekPct      = weekNorm ? Math.round((weekConsumed / weekNorm) * 100) : 0;
  const daysInNorm   = last7.filter((d) => d.status === "normal").length;

  /* Today compensation */
  const todayRow    = last7[last7.length - 1];
  const todayProtein= allEntries
    .filter((e) => e.date === getDateStr(0))
    .reduce((s, e) => s + e.protein, 0);
  const compensationTip = getCompensationTip(
    todayRow.cals, user.targetCalories, user.goal,
    user.targetProtein, todayProtein,
  );

  /* Chart data */
  const chartData = last7.map((d) => ({
    name: d.short,
    ккал: d.cals,
    fill: BAR_FILL[d.status],
  }));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-10">

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-10 pb-4">
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Статистика</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-5 space-y-4">

          {/* ── Weekly Summary ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Итог за неделю</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-primary">{weekConsumed.toLocaleString("ru")}</p>
                <p className="text-xs text-muted-foreground mt-1">съедено ккал</p>
              </div>
              <div className="bg-secondary rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{weekNorm.toLocaleString("ru")}</p>
                <p className="text-xs text-muted-foreground mt-1">норма ккал</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* progress bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Выполнение нормы</span>
                  <span>{weekPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${weekPct >= 85 && weekPct <= 115 ? "bg-emerald-400" : weekPct > 115 ? "bg-red-400" : "bg-amber-400"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(weekPct, 100)}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {weekDiff > 0 ? "Профицит" : "Дефицит"} за неделю
                </span>
                <span className={weekDiff > 0 ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>
                  {weekDiff > 0 ? "+" : ""}
                  {weekDiff.toLocaleString("ru")} ккал
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Дней в норме</span>
                <span className="font-medium">{daysInNorm} из 7</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground leading-relaxed bg-secondary rounded-xl p-3">
              За неделю вы съели <strong>{weekConsumed.toLocaleString("ru")} ккал</strong> из{" "}
              <strong>{weekNorm.toLocaleString("ru")} ккал</strong>.{" "}
              {weekDiff > 0
                ? `Профицит: ${weekDiff.toLocaleString("ru")} ккал.`
                : `Дефицит: ${Math.abs(weekDiff).toLocaleString("ru")} ккал.`}{" "}
              В норме: <strong>{daysInNorm} из 7 дней</strong>.
            </p>
          </motion.div>

          {/* ── Bar chart ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Калории по дням</h2>
            {last7.every((d) => d.cals === 0) ? (
              <p className="text-muted-foreground text-sm text-center py-8">Нет данных за последние 7 дней</p>
            ) : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={chartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(v: number) => [`${v} ккал`, "Калории"]}
                  />
                  <ReferenceLine y={user.targetCalories} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "норма", fill: "hsl(var(--primary))", fontSize: 10, position: "right" }} />
                  <Bar dataKey="ккал" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-3 justify-center">
              {[["🟢", "В норме"], ["🟡", "Недобор"], ["🔴", "Перебор"]].map(([e, l]) => (
                <span key={l} className="text-xs text-muted-foreground">{e} {l}</span>
              ))}
            </div>
          </motion.div>

          {/* ── Day cards ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Детально по дням</h2>
            <div className="space-y-3">
              {last7.slice().reverse().map((day, i) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-secondary rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{day.label}</p>
                      <p className={`text-xs mt-0.5 ${STATUS_COLOR[day.status]}`}>
                        {STATUS_EMOJI[day.status]} {STATUS_LABEL[day.status]}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{day.cals} <span className="text-xs font-normal text-muted-foreground">ккал</span></p>
                      <p className="text-xs text-muted-foreground">из {user.targetCalories}</p>
                    </div>
                  </div>
                  {day.cals > 0 && (
                    <>
                      <div className="h-1.5 rounded-full bg-background overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${day.status === "over" ? "bg-red-400" : day.status === "under" ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min((day.cals / user.targetCalories) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Белки", val: day.protein, norm: user.targetProtein, color: "text-blue-400" },
                          { label: "Жиры",  val: day.fat,     norm: user.targetFat,     color: "text-amber-400" },
                          { label: "Углев", val: day.carbs,   norm: user.targetCarbs,   color: "text-violet-400" },
                          { label: "Клетч", val: day.fiber,   norm: user.targetFiber,   color: "text-emerald-400" },
                        ].map((m) => (
                          <div key={m.label}>
                            <p className={`text-xs font-semibold ${m.color}`}>{m.val} г</p>
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Smart Compensation ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Умная компенсация</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{compensationTip}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Weekly macros ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Средние показатели за неделю</h2>
            <div className="space-y-3">
              {[
                { label: "Белки",    avg: Math.round(last7.reduce((s, d) => s + d.protein, 0) / 7), norm: user.targetProtein, color: "bg-blue-400", textColor: "text-blue-400" },
                { label: "Жиры",     avg: Math.round(last7.reduce((s, d) => s + d.fat,     0) / 7), norm: user.targetFat,     color: "bg-amber-400", textColor: "text-amber-400" },
                { label: "Углеводы", avg: Math.round(last7.reduce((s, d) => s + d.carbs,   0) / 7), norm: user.targetCarbs,   color: "bg-violet-400", textColor: "text-violet-400" },
                { label: "Клетчатка",avg: Math.round(last7.reduce((s, d) => s + d.fiber,   0) / 7), norm: user.targetFiber,   color: "bg-emerald-400", textColor: "text-emerald-400" },
              ].map((m) => {
                const pct = Math.min((m.avg / (m.norm || 1)) * 100, 100);
                return (
                  <div key={m.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={`font-medium ${m.textColor}`}>{m.label}</span>
                      <span className="text-muted-foreground">{m.avg} / {m.norm} г/день</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${m.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
