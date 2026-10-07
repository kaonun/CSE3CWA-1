import "server-only";
import { phonemeError } from "@/lib/phonemes/validation.mjs";
import { buildHtml } from "@/lib/export/buildHtml";
import { generateWordSearch } from "@/lib/wordsearch/generate";
import { ApiError } from "./http";

function requireValue(condition, message) {
  if (!condition) throw new ApiError(400, message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateWord(word, label, maxLength) {
  const message = phonemeError(word, label, maxLength);
  requireValue(!message, message);
  return [...word];
}

function integerInRange(value, min, max, label) {
  requireValue(Number.isInteger(value) && value >= min && value <= max,
    `${label} must be a whole number from ${min} to ${max}.`);
  return value;
}

// Both temporary and database-backed workflows share this validated boundary.
export function generateActivity(input) {
  requireValue(isObject(input), "Activity data must be an object.");
  const { type, theme, config } = input;
  requireValue(type === "wordle" || type === "wordsearch", "Choose Wordle or Word Search.");
  requireValue(theme === "light" || theme === "dark", "Theme must be light or dark.");
  requireValue(isObject(config), "Activity settings are required.");
  const title = input.title;
  if (title !== undefined) requireValue(typeof title === "string" && title.trim().length > 0 && title.length <= 120, "Activity title must be nonempty text of up to 120 characters.");

  if (type === "wordle") {
    const answer = validateWord(config.answer, "The answer", 15);
    requireValue(typeof config.englishWord === "string" && config.englishWord.length <= 120,
      "The English word must be text of up to 120 characters.");
    requireValue(typeof config.showHints === "boolean", "Show hints must be true or false.");
    const validated = {
      answer,
      englishWord: config.englishWord,
      maxGuesses: integerInRange(config.maxGuesses, 3, 8, "Number of guesses"),
      showHints: config.showHints,
    };
    if (config.hint !== undefined) {
      requireValue(typeof config.hint === "string" && config.hint.length <= 300, "Word hint must be text of up to 300 characters.");
      validated.hint = config.hint;
    }
    if (title !== undefined) validated.title = title;
    return {
      filename: "phonemele-wordle.html",
      html: buildHtml({ type, theme, title, config: validated }),
    };
  }

  const size = integerInRange(config.size, 6, 15, "Grid size");
  requireValue(config.difficulty === "easy" || config.difficulty === "hard",
    "Difficulty must be easy or hard.");
  requireValue(Array.isArray(config.words) && config.words.length >= 1 && config.words.length <= 30,
    "The word list must contain 1–30 words.");
  const words = config.words.map((word, index) => validateWord(word, `Word ${index + 1}`, size));
  if (config.wordMetadata !== undefined) {
    requireValue(Array.isArray(config.wordMetadata) && config.wordMetadata.length === words.length, "Word metadata must match the saved word list.");
    requireValue(typeof config.showHints === "boolean", "Show hints must be true or false.");
    for (const metadata of config.wordMetadata) {
      requireValue(isObject(metadata) && typeof metadata.id === "string" && metadata.id.length <= 80 &&
        typeof metadata.englishWord === "string" && metadata.englishWord.length <= 120 &&
        typeof metadata.hint === "string" && metadata.hint.length <= 300, "Word metadata is invalid.");
      requireValue(Object.keys(metadata).every((key) => ["id", "englishWord", "hint"].includes(key)), "Word metadata cannot override puzzle tokens or coordinates.");
    }
  }
  const options = {
    diagonals: config.difficulty === "hard",
    reversals: config.difficulty === "hard",
  };
  // Try a few complete layouts before asking the teacher to adjust the list.
  // Never return a downloadable puzzle that silently omits requested words.
  let puzzle;
  for (let attempt = 0; attempt < 5; attempt++) {
    puzzle = generateWordSearch(words, size, options);
    if (puzzle.failed.length === 0) break;
  }
  if (puzzle.failed.length > 0) {
    throw new ApiError(422, "Could not fit every word. Try again, increase the grid size, or use fewer or shorter words.");
  }
  const exported = { grid: puzzle.grid, placements: puzzle.placements };
  if (config.wordMetadata !== undefined) {
    // Queue metadata by token sequence so duplicates remain separate records.
    const metadataByWord = new Map();
    words.forEach((word, index) => {
      const key = JSON.stringify(word);
      if (!metadataByWord.has(key)) metadataByWord.set(key, []);
      metadataByWord.get(key).push(config.wordMetadata[index]);
    });
    puzzle.placements = puzzle.placements.map((placement) => ({ ...placement, ...metadataByWord.get(JSON.stringify(placement.word)).shift() }));
    exported.placements = puzzle.placements;
    exported.showHints = config.showHints;
  }
  if (title !== undefined) exported.title = title;
  return {
    filename: "phonemele-wordsearch.html",
    preview: puzzle,
    html: buildHtml({ type, theme, title, config: exported }),
  };
}
