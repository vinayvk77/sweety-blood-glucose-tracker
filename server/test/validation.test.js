import test from "node:test";
import assert from "node:assert/strict";
import { validateDate, validateReading } from "../src/validation.js";

const today = "2026-11-13";
const valid = { date: today, slot: "After lunch", value: 120 };

test("accepts a valid glucose reading", () => {
  assert.equal(validateReading(valid, today), null);
});

test("requires a value and restricts values to whole numbers from 40 to 600", () => {
  assert.equal(validateReading({ ...valid, value: "" }, today), "Please enter a glucose value.");
  assert.equal(validateReading({ ...valid, value: 39 }, today), "Value must be between 40 and 600 mg/dl.");
  assert.equal(validateReading({ ...valid, value: 601 }, today), "Value must be between 40 and 600 mg/dl.");
  assert.equal(validateReading({ ...valid, value: 120.5 }, today), "Value must be between 40 and 600 mg/dl.");
});

test("rejects future and impossible calendar dates", () => {
  assert.equal(validateReading({ ...valid, date: "2026-11-14" }, today), "Date cannot be in the future.");
  assert.equal(validateReading({ ...valid, date: "2026-02-30" }, today), "Please choose a valid date.");
});

test("validates report and list dates before querying the database", () => {
  assert.equal(validateDate(undefined, today), "Please choose a valid date.");
  assert.equal(validateDate("2026-02-30", today), "Please choose a valid date.");
  assert.equal(validateDate("2026-11-14", today), "Date cannot be in the future.");
  assert.equal(validateDate(today, today), null);
});

test("rejects slots outside the four supported daily readings", () => {
  assert.equal(validateReading({ ...valid, slot: "Bedtime" }, today), "Please choose a valid time slot.");
});
