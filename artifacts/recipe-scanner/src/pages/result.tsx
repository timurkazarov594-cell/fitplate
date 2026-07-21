import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useRecipeStore } from "@/lib/recipe-store";
import { useSavedRecipes } from "@/hooks/use-saved-recipes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Clock,
  ChefHat,
  Users,
  BookmarkPlus,
  BookmarkCheck,
  Copy,
  ArrowLeft,
  Flame
} from "lucide-react";

export function Result() {
  const [, setLocation] = useLocation();
  const { currentRecipe, currentImage, clearRecipeData } = useRecipeStore();
  const { saveRecipe, removeRecipe, savedRecipes } = useSavedRecipes();

  // Redirect if no recipe data exists
  useEffect(() => {
    if (!currentRecipe || !currentImage) {
      setLocation("/");
    }
  }, [currentRecipe, currentImage, setLocation]);

  if (!currentRecipe || !currentImage) {
    return null; // Will redirect shortly
  }

  const existingSavedRecipe = savedRecipes.find(r => r.recipe.dishName === currentRecipe.dishName);
  const currentlySaved = !!existingSavedRecipe;

  const handleSaveToggle = () => {
    if (currentlySaved && existingSavedRecipe) {
      removeRecipe(existingSavedRecipe.id);
      toast.success("Рецепт удалён из сохранённых");
    } else {
      saveRecipe(currentRecipe, currentImage);
      toast.success("Рецепт сохранён");
    }
  };

  const handleCopyRecipe = () => {
    const text = `
${currentRecipe.dishName}
${currentRecipe.description}

Время: ${currentRecipe.cookingTime} | Сложность: ${currentRecipe.difficulty} | Порций: ${currentRecipe.servingSize}

ИНГРЕДИЕНТЫ
${currentRecipe.ingredients.map(i => `- ${i.quantity} ${i.name}`).join("\n")}

ПРИГОТОВЛЕНИЕ
${currentRecipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

КБЖУ (на порцию)
Калории: ${currentRecipe.nutrition.calories}
Белки: ${currentRecipe.nutrition.protein}
Жиры: ${currentRecipe.nutrition.fats}
Углеводы: ${currentRecipe.nutrition.carbs}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      toast.success("Рецепт скопирован в буфер обмена!");
    }).catch(() => {
      toast.error("Не удалось скопировать рецепт");
    });
  };

  const handleAnalyzeAnother = () => {
    clearRecipeData();
    setLocation("/");
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-full pb-20">
      <Button
        variant="ghost"
        className="mb-6 -ml-4 text-muted-foreground hover:text-foreground"
        onClick={handleAnalyzeAnother}
        data-testid="button-analyze-another"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Загрузить другое фото
      </Button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-[40vh] min-h-[300px] rounded-3xl overflow-hidden mb-8 shadow-xl"
      >
        <img
          src={currentImage}
          alt={currentRecipe.dishName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="inline-block px-3 py-1 bg-primary/90 backdrop-blur-sm text-primary-foreground text-xs font-bold tracking-wider uppercase rounded-full mb-3 shadow-sm" data-testid="text-cuisine">
              {currentRecipe.cuisine}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight text-white drop-shadow-md mb-2" data-testid="text-dish-name">
              {currentRecipe.dishName}
            </h1>
            <p className="text-white/90 text-lg max-w-2xl text-shadow-sm font-medium" data-testid="text-description">
              {currentRecipe.description}
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-12">

          {/* Quick Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-wrap gap-4"
          >
            <Card className="flex-1 min-w-[120px] p-4 flex items-center gap-3 rounded-2xl border-none shadow-md bg-card">
              <div className="bg-orange-100 dark:bg-orange-950 p-2.5 rounded-xl text-orange-600 dark:text-orange-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Время</p>
                <p className="font-semibold">{currentRecipe.cookingTime}</p>
              </div>
            </Card>

            <Card className="flex-1 min-w-[120px] p-4 flex items-center gap-3 rounded-2xl border-none shadow-md bg-card">
              <div className="bg-blue-100 dark:bg-blue-950 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Сложность</p>
                <p className="font-semibold">{currentRecipe.difficulty}</p>
              </div>
            </Card>

            <Card className="flex-1 min-w-[120px] p-4 flex items-center gap-3 rounded-2xl border-none shadow-md bg-card">
              <div className="bg-green-100 dark:bg-green-950 p-2.5 rounded-xl text-green-600 dark:text-green-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Порций</p>
                <p className="font-semibold">{currentRecipe.servingSize}</p>
              </div>
            </Card>
          </motion.div>

          {/* Ingredients */}
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              Ингредиенты
            </h2>
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {currentRecipe.ingredients.map((ingredient, idx) => (
                <motion.li
                  key={idx}
                  variants={itemVariants}
                  className="flex items-baseline justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <span className="font-medium text-foreground">{ingredient.name}</span>
                  <span className="text-muted-foreground border-b border-dashed border-muted-foreground/30 flex-1 mx-4"></span>
                  <span className="font-semibold text-primary">{ingredient.quantity}</span>
                </motion.li>
              ))}
            </motion.ul>
          </section>

          {/* Steps */}
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
              Приготовление
            </h2>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {currentRecipe.steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="flex gap-4 group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {idx + 1}
                  </div>
                  <p className="pt-1 text-foreground leading-relaxed">{step}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Actions */}
          <div className="sticky top-24 space-y-8">
            <Card className="p-6 rounded-3xl shadow-xl border-none bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className={`w-full rounded-xl h-12 text-md transition-all ${currentlySaved ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}`}
                  onClick={handleSaveToggle}
                  data-testid="button-save-recipe"
                >
                  {currentlySaved ? (
                    <><BookmarkCheck className="w-5 h-5 mr-2" /> В коллекции</>
                  ) : (
                    <><BookmarkPlus className="w-5 h-5 mr-2" /> Сохранить рецепт</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full rounded-xl h-12 text-md"
                  onClick={handleCopyRecipe}
                  data-testid="button-copy-recipe"
                >
                  <Copy className="w-5 h-5 mr-2" /> Скопировать рецепт
                </Button>
              </div>
            </Card>

            {/* Nutrition */}
            <div className="bg-muted/30 rounded-3xl p-6 border border-border/50">
              <h3 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" /> КБЖУ на порцию
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card p-4 rounded-2xl shadow-sm" data-testid="card-nutrition-calories">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Калории</p>
                  <p className="text-xl font-bold text-foreground">{currentRecipe.nutrition.calories}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl shadow-sm" data-testid="card-nutrition-protein">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Белки</p>
                  <p className="text-xl font-bold text-foreground">{currentRecipe.nutrition.protein}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl shadow-sm" data-testid="card-nutrition-fats">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Жиры</p>
                  <p className="text-xl font-bold text-foreground">{currentRecipe.nutrition.fats}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl shadow-sm" data-testid="card-nutrition-carbs">
                  <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Углеводы</p>
                  <p className="text-xl font-bold text-foreground">{currentRecipe.nutrition.carbs}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
