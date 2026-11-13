export const SLOTS = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];

export function validateDate(date, today = new Date().toISOString().slice(0, 10)) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return "Please choose a valid date.";
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    return "Please choose a valid date.";
  }

  if (date > today) {
    return "Date cannot be in the future.";
  }

  return null;
}

export function validateReading(input, today) {
  if (input.value === undefined || input.value === null || input.value === "") {
    return "Please enter a glucose value.";
  }

  const value = Number(input.value);
  if (!Number.isInteger(value) || value < 40 || value > 600) {
    return "Value must be between 40 and 600 mg/dl.";
  }

  const dateError = validateDate(input.date, today);
  if (dateError) return dateError;

  if (!SLOTS.includes(input.slot)) {
    return "Please choose a valid time slot.";
  }

  return null;
}
