import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/authContext";
import { PACK_SIZE, PACK_PRICE, AGREEMENT_TEXT, usePurchaseAnalysisPack } from "@/lib/purchase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BENEFITS = [
  "Анализ любого блюда по фотографии",
  "Подсчёт калорий, белков, жиров, углеводов и клетчатки",
  "Добавление блюда в дневник питания",
  "Персональные рекомендации по питанию",
];

export function CreditsWidget() {
  const { user } = useAuth();
  const { purchase, isPending } = usePurchaseAnalysisPack();

  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!user) return null;

  const handleOpen = () => {
    setAgreed(false);
    setErrorMsg("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setAgreed(false);
    setErrorMsg("");
  };

  const handleBuy = () => {
    if (!agreed) return;
    purchase({ onError: (msg) => setErrorMsg(msg) });
  };

  const hasAccess = !user.freeAnalysisUsed || user.photoCredits > 0;

  return (
    <>
      {/* Counter + buy button */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
            hasAccess
              ? "bg-card border-border text-muted-foreground"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {user.freeAnalysisUsed ? `Осталось: ${user.photoCredits}` : "1 бесплатный"}
        </span>

        <button
          onClick={handleOpen}
          className="flex items-center gap-1 bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-150 shadow-sm shadow-primary/30"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Купить {PACK_SIZE} анализов</span>
        </button>
      </div>

      {/* Purchase modal */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-sm mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">FitPlate Pack</DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Price */}
              <div className="text-center py-2 bg-primary/5 rounded-2xl">
                <p className="text-sm text-muted-foreground">{PACK_SIZE} анализов фотографий еды</p>
                <p className="text-3xl font-bold text-primary mt-1">{PACK_PRICE} ₽</p>
              </div>

              {/* Benefits */}
              <div className="space-y-2.5">
                {BENEFITS.map((b) => (
                  <div key={b} className="flex items-start gap-2.5">
                    <span className="text-primary text-base leading-none mt-0.5">✅</span>
                    <span className="text-sm leading-snug">{b}</span>
                  </div>
                ))}
              </div>

              {/* Agreement checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="widget-agreement"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(!!v)}
                  className="mt-0.5 flex-shrink-0"
                />
                <label
                  htmlFor="widget-agreement"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
                >
                  Я принимаю{" "}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setShowAgreement(true); }}
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Пользовательское соглашение
                  </button>
                  .
                </label>
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive text-center">{errorMsg}</p>
              )}

              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  className="w-full h-12 rounded-xl font-semibold"
                  onClick={handleBuy}
                  disabled={!agreed || isPending}
                >
                  {isPending ? "Переходим к оплате..." : `Купить за ${PACK_PRICE} ₽`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Отмена
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Agreement text popup */}
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="bg-card border-border max-w-sm mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle>Пользовательское соглашение</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{AGREEMENT_TEXT}</p>
          <Button
            className="w-full rounded-xl mt-2"
            onClick={() => { setAgreed(true); setShowAgreement(false); }}
          >
            Принять
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
