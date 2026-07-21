import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const mutation = useLoginUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Введите email и пароль.");
      return;
    }
    mutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user);
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          setError(
            (err as { data?: { error?: string } })?.data?.error ??
              "Ошибка входа. Попробуйте снова."
          );
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-5 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Вход</h1>
          <p className="text-muted-foreground mt-2">AI Nutrition Coach</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="your@email.com"
              className="h-12 bg-card border-border"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Пароль</label>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              className="h-12 bg-card border-border"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-base font-medium rounded-xl mt-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Входим..." : "Войти"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Нет аккаунта?{" "}
          <button
            onClick={() => setLocation("/register")}
            className="text-primary underline underline-offset-2"
          >
            Зарегистрироваться
          </button>
        </p>
      </motion.div>
    </div>
  );
}
