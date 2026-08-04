import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-in-production";

export type JwtPayload =
  | { type: "user"; userId: number }
  | { type: "partner"; partnerId: number }
  // Legacy shape issued before partner tokens existed; treated as a user token.
  | { userId: number };

export function signUserToken(userId: number): string {
  return jwt.sign({ type: "user", userId } satisfies JwtPayload, JWT_SECRET, { expiresIn: "90d" });
}

export function signPartnerToken(partnerId: number): string {
  return jwt.sign({ type: "partner", partnerId } satisfies JwtPayload, JWT_SECRET, { expiresIn: "90d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

interface ProfileBase {
  gender: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  activity: string;
}

interface Targets {
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  targetFiber: number;
}

export function calculateTargets(p: ProfileBase): Targets {
  let bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  bmr += p.gender === "male" ? 5 : -161;

  const mult: Record<string, number> = { none: 1.2, low: 1.375, medium: 1.55, high: 1.725 };
  let calories = bmr * (mult[p.activity] ?? 1.375);

  if (p.goal === "loss") calories -= 500;
  if (p.goal === "gain") calories += 300;

  const protein = p.weight * 1.8;
  const fat = (calories * 0.25) / 9;
  const carbs = (calories - protein * 4 - fat * 9) / 4;

  return {
    targetCalories: Math.round(calories),
    targetProtein: Math.round(protein),
    targetFat: Math.round(fat),
    targetCarbs: Math.round(carbs),
    targetFiber: 25,
  };
}
