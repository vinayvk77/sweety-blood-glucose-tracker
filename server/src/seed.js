import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before seeding.");
}

try {
  const schemaUrl = new URL("../schema.sql", import.meta.url);
  await pool.query(await readFile(fileURLToPath(schemaUrl), "utf8"));

  const passwordHash = await bcrypt.hash("SweetyDemo123!", 12);
  const userResult = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ('Demo Patient', 'demo@sweety.local', $1)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [passwordHash],
  );
  const userId = userResult.rows[0].id;
  const today = new Date().toISOString().slice(0, 10);
  const readings = [
    ["Morning (fasting)", 104],
    ["After breakfast", 138],
    ["After lunch", 126],
  ];

  for (const [slot, value] of readings) {
    await pool.query(
      `INSERT INTO readings (user_id, date, slot, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, date, slot) DO UPDATE SET value = EXCLUDED.value`,
      [userId, today, slot, value],
    );
  }
  console.log("Demo account ready: demo@sweety.local / SweetyDemo123!");
} finally {
  await pool.end();
}
