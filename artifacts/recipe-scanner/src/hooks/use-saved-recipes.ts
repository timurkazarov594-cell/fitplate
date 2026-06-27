import { useEffect, useState } from "react";
import type { AnalyzedRecipe } from "@workspace/api-client-react";

export interface SavedRecipe {
  id: string;
  savedAt: string;
  recipe: AnalyzedRecipe;
  image: string;
}

const STORAGE_KEY = "recipe-scanner:saved";

export function useSavedRecipes() {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSavedRecipes(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load saved recipes", err);
      }
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const saveRecipe = (recipe: AnalyzedRecipe, image: string) => {
    const newRecipe: SavedRecipe = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      recipe,
      image,
    };
    
    const updated = [newRecipe, ...savedRecipes];
    setSavedRecipes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const removeRecipe = (id: string) => {
    const updated = savedRecipes.filter(r => r.id !== id);
    setSavedRecipes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };
  
  const isSaved = (recipeName: string) => {
    return savedRecipes.some(r => r.recipe.dishName === recipeName);
  };

  return { savedRecipes, saveRecipe, removeRecipe, isSaved };
}
