import { PHONEMES } from "../../data/phonemes.js";

const symbols = new Set(PHONEMES.map(({ symbol }) => symbol));

// Pure boundary shared by storage readers, write validation and generation.
// Never split, trim or silently replace a token: the inventory is authoritative.
export function phonemeError(value, label = "A word", max = 15) {
  if (!Array.isArray(value)) return `${label} must be an array of complete phoneme tokens, not a raw string.`;
  if (value.length < 1 || value.length > max) return `${label} must contain 1–${max} complete phoneme tokens.`;
  const invalid = value.findIndex((symbol) => typeof symbol !== "string" || !symbols.has(symbol));
  if (invalid !== -1) return `${label}: phoneme ${invalid + 1} is unsupported or malformed. Select a complete symbol from the phoneme keyboard.`;
  return "";
}
