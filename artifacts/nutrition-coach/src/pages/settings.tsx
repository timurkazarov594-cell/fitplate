import { useLocation } from "wouter";
import { CreditsWidget } from "@/components/credits-widget";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useUpdateProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

const profileSchema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  gender: z.enum(["male", "female"]),
  age: z.coerce.number().min(10).max(120),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(30).max(300),
  goal: z.enum(["loss", "maintain", "gain"]),
  activity: z.enum(["none", "low", "medium", "high"]),
});

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, updateUser, clearAuth } = useAuth();
  const { toast } = useToast();
  const mutation = useUpdateProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      gender: (user?.gender as "male" | "female") ?? "male",
      age: user?.age ?? 25,
      height: user?.height ?? 175,
      weight: user?.weight ?? 70,
      goal: (user?.goal as "loss" | "maintain" | "gain") ?? "maintain",
      activity: (user?.activity as "none" | "low" | "medium" | "high") ?? "low",
    },
  });

  if (!user) {
    setLocation("/");
    return null;
  }

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    mutation.mutate(
      { data: values },
      {
        onSuccess: (updated) => {
          updateUser(updated);
          toast({ title: "Профиль обновлён", description: "Дневные нормы пересчитаны." });
        },
        onError: (err: unknown) => {
          toast({
            title: "Ошибка",
            description: (err as { data?: { error?: string } })?.data?.error ?? "Не удалось сохранить.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const goalLabel: Record<string, string> = { loss: "Похудение", maintain: "Поддержание веса", gain: "Набор массы" };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-10">
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button
          onClick={() => setLocation("/dashboard")}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold flex-1">Профиль</h1>
        <CreditsWidget />
      </div>

      <div className="px-5 space-y-4 max-w-md mx-auto">
        {/* Credits status */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-4 border flex items-center gap-3 ${user.photoCredits > 0 ? "bg-card border-border" : "bg-destructive/5 border-destructive/20"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${user.photoCredits > 0 ? "bg-primary/10" : "bg-secondary"}`}>
            <svg className={`w-5 h-5 ${user.photoCredits > 0 ? "text-primary" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Пакет анализов</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Осталось анализов:{" "}
              <span className={user.photoCredits > 0 ? "text-primary font-bold" : "text-destructive font-bold"}>
                {user.photoCredits}
              </span>
            </p>
          </div>
          <button
            onClick={() => setLocation("/payment")}
            className="text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors flex-shrink-0"
          >
            {user.photoCredits > 0 ? "Пополнить" : "Купить"}
          </button>
        </motion.div>

        {/* Norms card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Дневные нормы</h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: "Ккал", value: user.targetCalories, color: "text-primary" },
              { label: "Белки г", value: user.targetProtein, color: "text-blue-400" },
              { label: "Жиры г", value: user.targetFat, color: "text-amber-400" },
              { label: "Углев г", value: user.targetCarbs, color: "text-violet-400" },
              { label: "Клетч г", value: user.targetFiber, color: "text-emerald-400" },
            ].map((m) => (
              <div key={m.label}>
                <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Цель: {goalLabel[user.goal]} · {user.email}
          </p>
        </motion.div>

        {/* Edit profile form */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-5">Редактировать профиль</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl><Input className="h-12 bg-secondary border-border" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Пол</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-3 space-y-0 bg-secondary p-3 rounded-xl border border-border flex-1 cursor-pointer">
                        <FormControl><RadioGroupItem value="male" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Мужской</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 bg-secondary p-3 rounded-xl border border-border flex-1 cursor-pointer">
                        <FormControl><RadioGroupItem value="female" /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">Женский</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="age" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Возраст</FormLabel>
                    <FormControl><Input type="number" className="h-12 bg-secondary border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="height" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Рост см</FormLabel>
                    <FormControl><Input type="number" className="h-12 bg-secondary border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Вес кг</FormLabel>
                    <FormControl><Input type="number" step="0.1" className="h-12 bg-secondary border-border" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="goal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Цель</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="loss">Похудение</SelectItem>
                      <SelectItem value="maintain">Поддержание веса</SelectItem>
                      <SelectItem value="gain">Набор массы</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="activity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Активность</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Нет тренировок</SelectItem>
                      <SelectItem value="low">1-2 раза в неделю</SelectItem>
                      <SelectItem value="medium">3-5 раз в неделю</SelectItem>
                      <SelectItem value="high">6+ раз в неделю</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <Button type="submit" className="w-full h-12 rounded-xl" disabled={mutation.isPending}>
                {mutation.isPending ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
            </form>
          </Form>
        </div>

        <button
          onClick={() => { clearAuth(); setLocation("/"); }}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Выйти из аккаунта
        </button>

        <button
          onClick={() => {
            if (confirm("Удалить все локальные данные и выйти?")) {
              clearAuth();
              localStorage.clear();
              setLocation("/");
            }
          }}
          className="w-full py-2 text-sm text-destructive text-center"
        >
          Сбросить все данные
        </button>
      </div>
      <Toaster />
    </div>
  );
}
