import "dotenv/config";
import cors from "cors";
import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { router } from "./routes.js";

const required = ["DATABASE_URL", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const schemaPath = new URL("../schema.sql", import.meta.url);
await pool.query(await readFile(fileURLToPath(schemaPath), "utf8"));

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "16kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api", router);
app.use((error, _req, res, _next) => {
  console.error(error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Sweety API listening on http://localhost:${port}`);
});
