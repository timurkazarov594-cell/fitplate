import React from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useSavedRecipes } from "@/hooks/use-saved-recipes";
import { useRecipeStore } from "@/lib/recipe-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Trash2, ArrowRight } from "lucide-react";

export function Saved() {
  const [, setLocation] = useLocation();
  const { savedRecipes, removeRecipe } = useSavedRecipes();
  const { setRecipeData } = useRecipeStore();

  const handleOpenRecipe = (recipeData: any) => {
    setRecipeData(recipeData.recipe, recipeData.image);
    setLocation("/result");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 text-primary p-3 rounded-2xl">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight">Сохранённые рецепты</h1>
          <p className="text-muted-foreground">Ваша личная коллекция рецептов</p>
        </div>
      </div>

      {savedRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground">
            <BookOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">Здесь пока пусто</h2>
          <p className="text-muted-foreground max-w-sm mb-8">
            Вы ещё не сохранили ни одного рецепта. Загрузите фото блюда, чтобы добавить его в коллекцию.
          </p>
          <Button size="lg" onClick={() => setLocation("/")} className="rounded-xl h-12">
            Распознать блюдо
          </Button>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {savedRecipes.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 rounded-3xl bg-card group flex flex-col h-full cursor-pointer hover:-translate-y-1"
                onClick={() => handleOpenRecipe(item)}
                data-testid={`card-saved-recipe-${item.id}`}
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.recipe.dishName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase rounded-full shadow-sm">
                      {item.recipe.cuisine}
                    </span>
                  </div>

                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-3 right-3 rounded-full w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecipe(item.id);
                    }}
                    title="Удалить рецепт"
                    data-testid={`button-remove-recipe-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-xl font-serif font-bold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {item.recipe.dishName}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {item.recipe.description}
                  </p>

                  <div className="flex items-center justify-between text-sm pt-4 border-t border-border">
                    <div className="flex items-center text-muted-foreground font-medium">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {item.recipe.cookingTime}
                    </div>
                    <div className="text-primary font-semibold flex items-center">
                      Открыть рецепт <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
