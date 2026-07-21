import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 rounded-3xl border-none shadow-xl">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-3 mb-4">
            <AlertCircle className="h-10 w-10 text-primary" />
            <h1 className="text-2xl font-serif font-bold text-foreground">Страница не найдена</h1>
          </div>

          <p className="mt-2 mb-6 text-sm text-muted-foreground">
            Кажется, такой страницы нет. Вернитесь на главную, чтобы распознать блюдо.
          </p>

          <Button onClick={() => setLocation("/")} className="rounded-xl h-11">
            На главную
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
