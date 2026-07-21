import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { AnalyzedRecipe } from '@workspace/api-client-react';

interface RecipeStoreState {
  currentRecipe: AnalyzedRecipe | null;
  currentImage: string | null;
  setRecipeData: (recipe: AnalyzedRecipe, image: string) => void;
  clearRecipeData: () => void;
}

const RecipeContext = createContext<RecipeStoreState | undefined>(undefined);

export function RecipeProvider({ children }: { children: ReactNode }) {
  const [currentRecipe, setCurrentRecipe] = useState<AnalyzedRecipe | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  const setRecipeData = (recipe: AnalyzedRecipe, image: string) => {
    setCurrentRecipe(recipe);
    setCurrentImage(image);
  };

  const clearRecipeData = () => {
    setCurrentRecipe(null);
    setCurrentImage(null);
  };

  return (
    <RecipeContext.Provider value={{ currentRecipe, currentImage, setRecipeData, clearRecipeData }}>
      {children}
    </RecipeContext.Provider>
  );
}

export function useRecipeStore() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipeStore must be used within a RecipeProvider');
  }
  return context;
}
