import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AGREEMENT_TEXT = `Пользователь понимает и соглашается, что сервис предоставляет рекомендации и расчёты исключительно в информационных целях. Мы не гарантируем конкретный результат похудения, набора массы, улучшения формы или здоровья. Все решения о питании, тренировках и образе жизни принимаются пользователем самостоятельно и на собственный риск. Сервис не является медицинской консультацией, диагностическим инструментом или заменой специалиста. При наличии заболеваний или проблем со здоровьем необходимо проконсультироваться с врачом. Используя сервис, вы подтверждаете, что ознакомились с данными условиями и принимаете их в полном объёме.`;

const formSchema = z.object({
  name: z.string().min(2, "Введите имя (минимум 2 символа)"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  gender: z.enum(["male", "female"]),
  age: z.coerce.number().min(10).max(120),
  height: z.coerce.number().min(100).max(250),
  weight: z.coerce.number().min(30).max(300),
  goal: z.enum(["loss", "maintain", "gain"]),
  activity: z.enum(["none", "low", "medium", "high"]),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [apiError, setApiError] = useState("");

  const mutation = useRegisterUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      gender: "male",
      age: 25,
      height: 175,
      weight: 70,
      goal: "maintain",
      activity: "low",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!agreed) return;
    setApiError("");
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          setApiError(
            (err as { data?: { error?: string } })?.data?.error ??
              "Ошибка регистрации. Попробуйте снова."
          );
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-10">
      <div className="max-w-md mx-auto px-5">
        <div className="mb-8 mt-10">
          <button
            onClick={() => setLocation("/")}
            className="text-muted-foreground text-sm mb-4 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <h1 className="text-3xl font-bold mb-2">Регистрация</h1>
          <p className="text-muted-foreground">Создайте аккаунт для контроля питания</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Ваше имя" className="h-12 bg-card border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="your@email.com" className="h-12 bg-card border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Минимум 6 символов" className="h-12 bg-card border-border" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пол</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-3 space-y-0 bg-card p-4 rounded-xl border border-border flex-1 cursor-pointer">
                        <FormControl><RadioGroupItem value="male" /></FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">Мужской</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 bg-card p-4 rounded-xl border border-border flex-1 cursor-pointer">
                        <FormControl><RadioGroupItem value="female" /></FormControl>
                        <FormLabel className="font-normal w-full cursor-pointer">Женский</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Возраст</FormLabel>
                  <FormControl><Input type="number" className="h-12 bg-card border-border" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="height" render={({ field }) => (
                <FormItem>
                  <FormLabel>Рост (см)</FormLabel>
                  <FormControl><Input type="number" className="h-12 bg-card border-border" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weight" render={({ field }) => (
                <FormItem>
                  <FormLabel>Вес (кг)</FormLabel>
                  <FormControl><Input type="number" step="0.1" className="h-12 bg-card border-border" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="goal" render={({ field }) => (
              <FormItem>
                <FormLabel>Цель</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-14 bg-card border-border">
                      <SelectValue placeholder="Выберите цель" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="loss">Похудение</SelectItem>
                    <SelectItem value="maintain">Поддержание веса</SelectItem>
                    <SelectItem value="gain">Набор массы</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="activity" render={({ field }) => (
              <FormItem>
                <FormLabel>Уровень активности</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-14 bg-card border-border">
                      <SelectValue placeholder="Выберите активность" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Нет тренировок</SelectItem>
                    <SelectItem value="low">1-2 раза в неделю</SelectItem>
                    <SelectItem value="medium">3-5 раз в неделю</SelectItem>
                    <SelectItem value="high">6+ раз в неделю</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-start gap-3">
              <Checkbox
                id="agreement"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="agreement" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                Я принимаю{" "}
                <button
                  type="button"
                  onClick={() => setShowAgreement(true)}
                  className="text-primary underline underline-offset-2"
                >
                  пользовательское соглашение
                </button>
              </label>
            </div>

            {apiError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm text-center">
                {apiError}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg font-medium rounded-xl"
              disabled={!agreed || mutation.isPending}
            >
              {mutation.isPending ? "Создаём аккаунт..." : "Зарегистрироваться"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button type="button" onClick={() => setLocation("/login")} className="text-primary underline underline-offset-2">
                Войти
              </button>
            </p>
          </form>
        </Form>
      </div>

      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="bg-card border-border max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Пользовательское соглашение</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto">
            <p className="text-sm text-muted-foreground leading-relaxed">{AGREEMENT_TEXT}</p>
          </div>
          <Button className="w-full rounded-xl mt-2" onClick={() => { setAgreed(true); setShowAgreement(false); }}>
            Принять
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
