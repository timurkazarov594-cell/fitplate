import { parseArgs } from "node:util";
import bcrypt from "bcryptjs";
import { db, partnersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const { values } = parseArgs({
  options: {
    code: { type: "string" },
    password: { type: "string" },
    name: { type: "string" },
  },
});

if (!values.code || !values.password) {
  console.error(
    'Usage: cd scripts && DATABASE_URL=... pnpm exec tsx ./src/reset-partner-password.ts --code=ANNA10 --password=newSecret123 [--name="Новое имя"]',
  );
  process.exit(1);
}

if (values.password.length < 8) {
  console.error("Пароль партнёра должен быть не короче 8 символов.");
  process.exit(1);
}

const code = values.code.trim().toUpperCase();

const [existing] = await db.select({ id: partnersTable.id }).from(partnersTable).where(eq(partnersTable.code, code)).limit(1);
if (!existing) {
  console.error(`Партнёр с кодом "${code}" не найден.`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(values.password, 10);
const [partner] = await db.update(partnersTable)
  .set({ passwordHash, ...(values.name ? { name: values.name } : {}) })
  .where(eq(partnersTable.id, existing.id))
  .returning();

console.log(`Пароль обновлён: id=${partner!.id}, code=${partner!.code}, name=${partner!.name}`);
process.exit(0);
