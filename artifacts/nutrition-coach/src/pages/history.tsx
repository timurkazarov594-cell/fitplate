import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetFoodEntries, getGetFoodEntriesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";

type Tab = "today" | "yesterday" | "week" | "month";

const tabs: { key: Tab; label: string }[] = [
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "week", label: "7 дней" },
  { key: "month", label: "30 дней" },
];

function getDateStr(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export default function History() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("today");

  const dateParam = activeTab === "today" ? getDateStr(0) : activeTab === "yesterday" ? getDateStr(1) : undefined;
  const { data: allEntries = [], isLoading } = useGetFoodEntries(
    dateParam ? { date: dateParam } : {},
    { query: { enabled: !!user, queryKey: getGetFoodEntriesQueryKey(dateParam ? { date: dateParam } : {}) } }
  );

  const filtered = (() => {
    if (activeTab === "week") {
      const minDate = getDateStr(7);
      return allEntries.filter((e) => e.date >= minDate);
    }
    return allEntries;
  })().slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCals = filtered.reduce((s, e) => s + e.calories, 0);
  const totalProtein = filtered.reduce((s, e) => s + e.protein, 0);
  const totalFat = filtered.reduce((s, e) => s + e.fat, 0);
  const totalCarbs = filtered.reduce((s, e) => s + e.carbs, 0);

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-8">
      <div className="flex items-center gap-4 px-5 pt-10 pb-4">
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">История питания</h1>
      </div>

      <div className="px-5 mb-4">
        <div className="flex gap-2 bg-card border border-border rounded-2xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="px-5 mb-4">
          <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-4 gap-3 text-center">
            {[
              { label: "Ккал", value: Math.round(totalCals), color: "text-primary" },
              { label: "Белки г", value: Math.round(totalProtein), color: "text-blue-400" },
              { label: "Жиры г", value: Math.round(totalFat), color: "text-amber-400" },
              { label: "Углев г", value: Math.round(totalCarbs), color: "text-violet-400" },
            ].map((m) => (
              <div key={m.label}>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 space-y-3">
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <p className="text-muted-foreground text-sm">Нет записей за выбранный период</p>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
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
                <p className="text-xs text-muted-foreground">{entry.date} · {entry.portionWeight} г</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-primary font-medium">{Math.round(entry.calories)} ккал</span>
                  <span className="text-xs text-muted-foreground">Б {Math.round(entry.protein)}г</span>
                  <span className="text-xs text-muted-foreground">Ж {Math.round(entry.fat)}г</span>
                  <span className="text-xs text-muted-foreground">У {Math.round(entry.carbs)}г</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
