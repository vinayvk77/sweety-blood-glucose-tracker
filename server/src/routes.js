import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";
import { SLOTS, validateDate, validateReading } from "./validation.js";

export const router = Router();

router.post("/auth/register", async (req, res, next) => {
  const { name, email, password } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Please enter your name." });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name.trim(), email.trim().toLowerCase(), passwordHash],
    );
    return sendLogin(res, result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Please enter your email and password." });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email.trim().toLowerCase()],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    return sendLogin(res, user);
  } catch (error) {
    return next(error);
  }
});

router.get("/readings", requireAuth, async (req, res, next) => {
  const dateError = validateDate(req.query.date);
  if (dateError) return res.status(400).json({ error: dateError });

  try {
    const result = await pool.query(
      `SELECT id, date::text, slot, value
       FROM readings WHERE user_id = $1 AND date = $2
       ORDER BY array_position($3::text[], slot)`,
      [req.user.id, req.query.date, SLOTS],
    );
    return res.json({ readings: result.rows });
  } catch (error) {
    return next(error);
  }
});

router.post("/readings", requireAuth, async (req, res, next) => {
  const validationError = validateReading(req.body ?? {});
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const result = await pool.query(
      "INSERT INTO readings (user_id, date, slot, value) VALUES ($1, $2, $3, $4) RETURNING id, date::text, slot, value",
      [req.user.id, req.body.date, req.body.slot, Number(req.body.value)],
    );
    return res.status(201).json({ reading: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: `You already have an ${req.body.slot} reading for this date.` });
    }
    return next(error);
  }
});

router.put("/readings/:id", requireAuth, async (req, res, next) => {
  const validationError = validateReading(req.body ?? {});
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const result = await pool.query(
      `UPDATE readings SET date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, date::text, slot, value`,
      [req.body.date, req.body.slot, Number(req.body.value), req.params.id, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Reading not found." });
    return res.json({ reading: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: `You already have an ${req.body.slot} reading for this date.` });
    }
    return next(error);
  }
});

router.delete("/readings/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      "DELETE FROM readings WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Reading not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/reports", requireAuth, async (req, res, next) => {
  const selectedDate = req.query.date;
  const dateError = validateDate(selectedDate);
  if (dateError) return res.status(400).json({ error: dateError });

  const date = new Date(`${selectedDate}T00:00:00.000Z`);
  const monthStart = `${selectedDate.slice(0, 7)}-01`;
  const previousMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  const previousStart = previousMonth.toISOString().slice(0, 10);
  const previousEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0))
    .toISOString().slice(0, 10);

  try {
    const [daily, monthToDate, previousMonthReport] = await Promise.all([
      getReport(req.user.id, selectedDate, selectedDate),
      getReport(req.user.id, monthStart, selectedDate),
      getReport(req.user.id, previousStart, previousEnd),
    ]);
    return res.json({
      daily: { ...daily, startDate: selectedDate, endDate: selectedDate },
      monthToDate: { ...monthToDate, startDate: monthStart, endDate: selectedDate },
      previousMonth: { ...previousMonthReport, startDate: previousStart, endDate: previousEnd },
    });
  } catch (error) {
    return next(error);
  }
});

async function getReport(userId, startDate, endDate) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count, MIN(value)::int AS lowest,
            MAX(value)::int AS highest, ROUND(AVG(value)::numeric, 1)::float AS average
     FROM readings WHERE user_id = $1 AND date BETWEEN $2 AND $3`,
    [userId, startDate, endDate],
  );
  return result.rows[0];
}

function sendLogin(res, user) {
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}
