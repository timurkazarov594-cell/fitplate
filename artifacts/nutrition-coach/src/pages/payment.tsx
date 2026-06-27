import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PACK_SIZE, PACK_PRICE, AGREEMENT_TEXT, usePurchaseAnalysisPack } from "@/lib/purchase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PACK_FEATURES = [
  `${PACK_SIZE} анализов фотографий еды`,
  "КБЖУ на любую порцию мгновенно",
  "Сохранение в дневник питания",
  "Дневная статистика и графики",
  "Рекомендации по калориям и БЖУ",
];

export default function Payment() {
  const [, setLocation] = useLocation();
  const { purchase, isPending } = usePurchaseAnalysisPack();

  const [agreed, setAgreed] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);

  const handleBuyClick = () => {
    if (!agreed) return;
    setShowMockPaymentModal(true);
  };

  const handleActivatePack = () => {
    purchase({
      onSuccess: () => {
        setShowMockPaymentModal(false);
        setLocation("/analyze");
      },
      onError: () => {
        setShowMockPaymentModal(false);
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
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
      </div>

      <div className="flex-1 px-5 pb-10 flex flex-col">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-3xl border border-primary/20 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-1">FitPlate Pack</h1>
          <p className="text-muted-foreground text-sm">У вас закончились анализы</p>
          <div className="mt-6 flex flex-col items-center gap-1">
            <div className="flex items-end gap-1">
              <span className="text-5xl font-bold text-primary">{PACK_PRICE}</span>
              <span className="text-2xl font-bold text-primary">₽</span>
            </div>
            <span className="text-muted-foreground text-sm">за {PACK_SIZE} анализов фото еды</span>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 mb-4"
        >
          <h2 className="font-semibold mb-4">Что входит в пакет</h2>
          <div className="space-y-3">
            {PACK_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Agreement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-3 mb-6"
        >
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
              onClick={() => setShowAgreementModal(true)}
              className="text-primary underline underline-offset-2"
            >
              Пользовательское соглашение
            </button>
            .
          </label>
        </motion.div>

        <div className="mt-auto space-y-3">
          <Button
            className="w-full h-14 text-base font-medium rounded-xl"
            disabled={!agreed}
            onClick={handleBuyClick}
          >
            Купить {PACK_SIZE} анализов за {PACK_PRICE} ₽
          </Button>
          <button
            onClick={() => setShowSupportModal(true)}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Поддержка
          </button>
        </div>
      </div>

      {/* Mock Payment Modal */}
      <AnimatePresence>
        {showMockPaymentModal && (
          <Dialog open={showMockPaymentModal} onOpenChange={setShowMockPaymentModal}>
            <DialogContent className="bg-card border-border max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Тестовая покупка</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                  <p className="text-sm text-amber-400 leading-relaxed">
                    Оплата пока работает в тестовом режиме. После подключения ЮKassa здесь будет реальная оплата.
                  </p>
                </div>
                <div className="text-center py-2">
                  <p className="text-2xl font-bold text-primary">{PACK_PRICE} ₽</p>
                  <p className="text-sm text-muted-foreground mt-1">{PACK_SIZE} анализов фото еды</p>
                </div>
                <Button
                  className="w-full h-12 rounded-xl"
                  onClick={handleActivatePack}
                  disabled={isPending}
                >
                  {isPending ? "Активируем..." : "Активировать пакет"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={() => setShowMockPaymentModal(false)}
                  disabled={isPending}
                >
                  Отмена
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Agreement Modal */}
      <AnimatePresence>
        {showAgreementModal && (
          <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
            <DialogContent className="bg-card border-border max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Пользовательское соглашение</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-relaxed">{AGREEMENT_TEXT}</p>
              <Button
                className="w-full rounded-xl mt-2"
                onClick={() => { setAgreed(true); setShowAgreementModal(false); }}
              >
                Принять
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
            <DialogContent className="bg-card border-border max-w-sm mx-4">
              <DialogHeader>
                <DialogTitle>Поддержка</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground leading-relaxed">
                По всем вопросам:{" "}
                <a href="mailto:facemax1@mail.ru" className="text-primary">
                  facemax1@mail.ru
                </a>
              </p>
              <Button variant="outline" className="w-full rounded-xl mt-2" onClick={() => setShowSupportModal(false)}>
                Закрыть
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
