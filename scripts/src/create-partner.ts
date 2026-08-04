import { parseArgs } from "node:util";
import bcrypt from "bcryptjs";
import { db, partnersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const { values } = parseArgs({
  options: {
    code: { type: "string" },
    name: { type: "string" },
    password: { type: "string" },
  },
});

if (!values.code || !values.name || !values.password) {
  console.error(
    'Usage: cd scripts && DATABASE_URL=... pnpm exec tsx ./src/create-partner.ts --code=ANNA10 --name="Анна" --password=secret123',
  );
  process.exit(1);
}

if (values.password.length < 8) {
  console.error("Пароль партнёра должен быть не короче 8 символов.");
  process.exit(1);
}

const code = values.code.trim().toUpperCase();

const [existing] = await db.select({ id: partnersTable.id }).from(partnersTable).where(eq(partnersTable.code, code)).limit(1);
if (existing) {
  console.error(`Партнёр с кодом "${code}" уже существует.`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(values.password, 10);
const [partner] = await db.insert(partnersTable).values({ code, name: values.name, passwordHash }).returning();

console.log(`Создан партнёр: id=${partner!.id}, code=${partner!.code}, name=${partner!.name}`);
console.log(`Реферальная ссылка: /?ref=${partner!.code}`);
process.exit(0);
