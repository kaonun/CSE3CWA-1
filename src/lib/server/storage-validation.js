import "server-only";
import { phonemeError } from "@/lib/phonemes/validation.mjs";
import { ApiError } from "./http";

export function requireInput(condition, message) {
  if (!condition) throw new ApiError(400, message);
}
export function identifier(value, label = "Record ID") {
  requireInput(typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value), `${label} is invalid.`);
  return value;
}
export function objectFields(value, fields, partial = false) {
  requireInput(value !== null && typeof value === "object" && !Array.isArray(value), "Send a JSON object.");
  const keys = Object.keys(value);
  requireInput(keys.every((key) => fields.includes(key)), "The request contains unsupported fields.");
  if (partial) requireInput(keys.length > 0, "Provide at least one field to update.");
  return value;
}
export function text(value, label, max, required = false) {
  requireInput(typeof value === "string" && value.length <= max && (!required || value.trim().length > 0),
    `${label} must be ${required ? "nonempty " : ""}text of up to ${max} characters.`);
  requireInput(value.isWellFormed() && !value.includes("\u0000"), `${label} must contain valid Unicode text without null characters.`);
  return required ? value.trim() : value;
}
export function integer(value, min, max, label) {
  requireInput(Number.isInteger(value) && value >= min && value <= max, `${label} must be a whole number from ${min} to ${max}.`);
  return value;
}
export function validateList(value, partial = false) {
  objectFields(value, ["title", "description"], partial);
  return {
    ...(!partial || value.title !== undefined ? { title: text(value.title, "List title", 120, true) } : {}),
    ...(value.description !== undefined ? { description: text(value.description, "Description", 1000) } : partial ? {} : { description: "" }),
  };
}
export function validateWord(value, partial = false) {
  objectFields(value, ["phonemes", "englishWord", "hint"], partial);
  const output = {};
  if (!partial || value.phonemes !== undefined) {
    const message = phonemeError(value.phonemes);
    requireInput(!message, message);
    output.phonemes = [...value.phonemes];
  }
  for (const [key, label, max] of [["englishWord", "English word", 120], ["hint", "Word hint", 300]]) {
    if (value[key] !== undefined) output[key] = text(value[key], label, max);
    else if (!partial) output[key] = "";
  }
  return output;
}

export const CONFIGURATION_FIELDS = ["title", "wordListId", "type", "answerWordId", "maxGuesses", "gridSize", "difficulty", "showHints", "outputTheme", "outputFilename"];
export function validateConfiguration(value) {
  requireInput(value.type === "wordle" || value.type === "wordsearch", "Choose Wordle or Word Search.");
  requireInput(typeof value.showHints === "boolean", "Show hints must be true or false.");
  requireInput(value.outputTheme === "light" || value.outputTheme === "dark", "Output theme must be light or dark.");
  const filename = text(value.outputFilename, "Output filename", 120, true);
  requireInput(/^[a-zA-Z0-9_.-]+\.html$/.test(filename), "Use a safe .html filename without folders or spaces.");
  const output = {
    title: text(value.title, "Activity title", 120, true), wordListId: identifier(value.wordListId, "Word list ID"),
    type: value.type, showHints: value.showHints, outputTheme: value.outputTheme, outputFilename: filename,
    answerWordId: null, maxGuesses: null, gridSize: null, difficulty: null,
  };
  if (value.type === "wordle") {
    requireInput(value.gridSize == null && value.difficulty == null, "Grid size and difficulty apply only to Word Search.");
    output.answerWordId = identifier(value.answerWordId, "Answer word ID");
    output.maxGuesses = integer(value.maxGuesses, 3, 8, "Number of guesses");
  } else {
    requireInput(value.answerWordId == null && value.maxGuesses == null, "Answer and guesses apply only to Wordle.");
    output.gridSize = integer(value.gridSize, 6, 15, "Grid size");
    requireInput(value.difficulty === "easy" || value.difficulty === "hard", "Difficulty must be easy or hard.");
    output.difficulty = value.difficulty;
  }
  return output;
}

export function pagination(request) {
  const query = new URL(request.url).searchParams;
  function number(key, fallback, min, max) {
    if (!query.has(key)) return fallback;
    const raw = query.get(key);
    requireInput(/^\d+$/.test(raw), `${key} must be a nonnegative integer.`);
    return integer(Number(raw), min, max, key);
  }
  return { limit: number("limit", 50, 1, 100), offset: number("offset", 0, 0, 1000000) };
}
