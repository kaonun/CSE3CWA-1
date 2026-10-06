import "server-only";
import { PHONEMES } from "@/data/phonemes";
import { buildHtml } from "@/lib/export/buildHtml";
import { generateWordSearch } from "@/lib/wordsearch/generate";
import { ApiError } from "./http";

const symbols = new Set(PHONEMES.map(({ symbol }) => symbol));

function requireValue(condition, message) {
  if (!condition) throw new ApiError(400, message);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateWord(word, label, maxLength) {
  requireValue(Array.isArray(word) && word.length >= 1 && word.length <= maxLength,
    `${label} must contain 1–${maxLength} phoneme tokens.`);
  requireValue(word.every((token) => typeof token === "string" && symbols.has(token)),
    `${label} contains an unsupported phoneme. Select symbols from the phoneme keyboard.`);
  return [...word];
}

function integerInRange(value, min, max, label) {
  requireValue(Number.isInteger(value) && value >= min && value <= max,
    `${label} must be a whole number from ${min} to ${max}.`);
  return value;
}

// This service owns activity processing. Future persistence can supply the same
// validated settings and ordered tokens without changing the export templates.
export function generateActivity(input) {
  requireValue(isObject(input), "Activity data must be an object.");
  const { type, theme, config } = input;
  requireValue(type === "wordle" || type === "wordsearch", "Choose Wordle or Word Search.");
  requireValue(theme === "light" || theme === "dark", "Theme must be light or dark.");
  requireValue(isObject(config), "Activity settings are required.");

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
    return {
      filename: "phonemele-wordle.html",
      html: buildHtml({ type, theme, config: validated }),
    };
  }

  const size = integerInRange(config.size, 6, 15, "Grid size");
  requireValue(config.difficulty === "easy" || config.difficulty === "hard",
    "Difficulty must be easy or hard.");
  requireValue(Array.isArray(config.words) && config.words.length >= 1 && config.words.length <= 30,
    "The word list must contain 1–30 words.");
  const words = config.words.map((word, index) => validateWord(word, `Word ${index + 1}`, size));
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
  return {
    filename: "phonemele-wordsearch.html",
    preview: puzzle,
    html: buildHtml({ type, theme, config: { grid: puzzle.grid, placements: puzzle.placements } }),
  };
}
