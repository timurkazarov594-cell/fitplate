import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/button";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      </div>

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
        <p className="text-muted-foreground text-lg max-w-[280px] mx-auto mb-12">
          Фотографируй еду. Контролируй питание.
        </p>

        <div className="w-full max-w-sm mt-auto pb-8 space-y-3">
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
