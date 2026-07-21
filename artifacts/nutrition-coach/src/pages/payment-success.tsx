import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const token = localStorage.getItem("nc_token");
    if (!token) {
      setLocation("/");
      return;
    }

    // Fetch fresh user data so credits reflect the webhook result
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("auth failed");
        const fresh = await r.json();
        updateUser(fresh);
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-5">
      {status === "loading" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full"
          />
          <p className="text-muted-foreground text-sm">Проверяем статус оплаты...</p>
        </motion.div>
      )}

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center max-w-xs"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Оплата прошла!</h1>
            {user && (
              <p className="text-muted-foreground text-sm">
                У вас теперь{" "}
                <span className="text-primary font-bold">{user.photoCredits}</span>{" "}
                {creditsLabel(user.photoCredits)} для анализа.
              </p>
            )}
          </div>
          <div className="w-full space-y-3">
            <Button
              className="w-full h-12 rounded-xl font-semibold"
              onClick={() => setLocation("/analyze")}
            >
              Анализировать блюдо
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => setLocation("/dashboard")}
            >
              На главную
            </Button>
          </div>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center max-w-xs"
        >
          <div className="w-20 h-20 bg-amber-400/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Проверьте баланс</h1>
            <p className="text-muted-foreground text-sm">
              Не удалось подтвердить оплату прямо сейчас. Если списание прошло — кредиты будут начислены автоматически через несколько минут.
            </p>
          </div>
          <div className="w-full space-y-3">
            <Button
              className="w-full h-12 rounded-xl font-semibold"
              onClick={() => setLocation("/dashboard")}
            >
              На главную
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => window.location.reload()}
            >
              Обновить
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function creditsLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "анализ";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "анализа";
  return "анализов";
}
