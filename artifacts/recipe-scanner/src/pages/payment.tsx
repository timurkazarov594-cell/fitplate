import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, HeadphonesIcon, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export function Payment() {
  const [agreed, setAgreed] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const handlePay = () => {
    if (!agreed) return;
    // ЮKassa: логика оплаты подключается здесь
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-lg mx-auto w-full py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Доступ к сервису
          </h1>
          <p className="text-muted-foreground text-base">
            Загружайте фото блюд и получайте точные рецепты с КБЖУ
          </p>
        </div>

        {/* Карточка оплаты */}
        <Card className="rounded-3xl border-none shadow-xl bg-card p-8 space-y-6">
          {/* Преимущества */}
          <ul className="space-y-3 text-sm text-foreground">
            {[
              "Распознавание любых блюд",
              "Полный рецепт с граммовками",
              "Пошаговое приготовление",
              "КБЖУ на каждую порцию",
              "Сохранение рецептов в коллекцию",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-border/50" />

          {/* Цена */}
          <div className="flex items-end justify-between">
            <span className="text-muted-foreground text-sm">Стоимость доступа</span>
            <span className="text-4xl font-bold text-foreground">199 ₽</span>
          </div>

          <div className="border-t border-border/50" />

          {/* Чекбокс согласия */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="agreement"
              checked={agreed}
              onCheckedChange={(val) => setAgreed(val === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="agreement"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer select-none"
            >
              Я ознакомился и принимаю{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setAgreementOpen(true);
                }}
                className="text-primary underline underline-offset-2 hover:opacity-70 transition-opacity font-medium"
              >
                Пользовательское соглашение
              </button>
            </label>
          </div>

          {/* Кнопка оплаты */}
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!agreed}
            onClick={handlePay}
          >
            <Lock className="w-5 h-5 mr-2" />
            Оплатить 199 ₽
          </Button>

          {/* Поддержка */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HeadphonesIcon className="w-4 h-4" />
              Поддержка
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" />
          Оплата защищена ЮKassa
        </p>
      </motion.div>

      {/* Модальное окно: Пользовательское соглашение */}
      <Dialog open={agreementOpen} onOpenChange={setAgreementOpen}>
        <DialogContent className="rounded-3xl max-w-md mx-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground">
              Пользовательское соглашение
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Пользователь понимает и соглашается с тем, что результаты, рекомендации, оценки и
              выводы, предоставляемые нейросетью, носят исключительно информационный характер и
              могут содержать неточности, ошибки или неполные данные. Сервис не гарантирует
              абсолютную точность результатов. Используя сервис и оплачивая доступ, пользователь
              принимает данные условия.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">
                Закрыть
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Модальное окно: Поддержка */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="rounded-3xl max-w-md mx-4 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-foreground flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-primary" />
              Поддержка
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              По всем вопросам обращайтесь:
            </p>
            <a
              href="mailto:facemax1@mail.ru"
              className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:opacity-70 transition-opacity underline underline-offset-2"
            >
              facemax1@mail.ru
            </a>
          </div>
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-xl">
                Закрыть
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
