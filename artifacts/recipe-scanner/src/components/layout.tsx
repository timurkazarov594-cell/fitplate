import React from "react";
import { Link } from "wouter";
import { useTheme } from "./theme-provider";
import { Moon, Sun, BookOpen } from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-lg">
              Р
            </span>
            <span className="font-serif font-semibold text-lg hidden sm:inline-block tracking-tight">
              Рецепт по Фото
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/saved">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-saved-recipes">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline-block">Сохранённые</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="button-theme-toggle"
              aria-label="Переключить тему"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>

      <footer className="border-t border-border/40 py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>AI Рецепт по Фото &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
