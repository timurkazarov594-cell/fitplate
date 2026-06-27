import { useState, useEffect } from 'react';

export interface UserProfile {
  gender: "male" | "female";
  age: number;
  height: number;
  weight: number;
  goal: "loss" | "maintain" | "gain";
  activity: "none" | "low" | "medium" | "high";
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  targetFiber: number;
}

export interface FoodEntry {
  id: string;
  date: string;
  timestamp: number;
  dishName: string;
  ingredients: string[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  portionWeight: number;
  imageUrl?: string;
}

const PROFILE_KEY = 'fitness_user_profile';
const ENTRIES_KEY = 'fitness_food_entries';

export const calculateTargets = (profile: Omit<UserProfile, 'targetCalories' | 'targetProtein' | 'targetFat' | 'targetCarbs' | 'targetFiber'>): UserProfile => {
  let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age;
  bmr += profile.gender === 'male' ? 5 : -161;

  const activityMult = { none: 1.2, low: 1.375, medium: 1.55, high: 1.725 }[profile.activity];
  let tdee = bmr * activityMult;

  let calories = tdee;
  if (profile.goal === 'loss') calories -= 500;
  if (profile.goal === 'gain') calories += 300;

  const protein = profile.weight * 1.8;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;

  return {
    ...profile,
    targetCalories: Math.round(calories),
    targetProtein: Math.round(protein),
    targetFat: Math.round(fat),
    targetCarbs: Math.round(carbs),
    targetFiber: 25,
  };
};

export const getProfile = (): UserProfile | null => {
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event('fitness_store_update'));
};

export const getEntries = (): FoodEntry[] => {
  const data = localStorage.getItem(ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
};

export const addEntry = (entry: FoodEntry) => {
  const entries = getEntries();
  entries.push(entry);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event('fitness_store_update'));
};

export function useFitnessStore() {
  const [profile, setProfileState] = useState<UserProfile | null>(getProfile);
  const [entries, setEntriesState] = useState<FoodEntry[]>(getEntries);

  useEffect(() => {
    const handleUpdate = () => {
      setProfileState(getProfile());
      setEntriesState(getEntries());
    };
    window.addEventListener('fitness_store_update', handleUpdate);
    return () => window.removeEventListener('fitness_store_update', handleUpdate);
  }, []);

  return { profile, entries };
}
