import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLoginPartner } from "@workspace/api-client-react";
import { setPartnerToken } from "@/lib/partnerAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PartnerLogin() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const mutation = useLoginPartner();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code) {
      setError("Введите код партнёра.");
      return;
    }
    mutation.mutate(
      { data: { code } },
      {
        onSuccess: (data) => {
          setPartnerToken(data.token);
          setLocation("/partner");
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
          <h1 className="text-3xl font-bold">Кабинет партнёра</h1>
          <p className="text-muted-foreground mt-2">Вход по коду партнёра</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Код партнёра</label>
            <Input
              autoComplete="username"
              placeholder="ANNA10"
              className="h-12 bg-card border-border"
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
      </motion.div>
    </div>
  );
}
