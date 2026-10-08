import "server-only";
import { generateActivity } from "./activities";
import { getConfiguration } from "./storage";
import { requireInput, validateConfiguration } from "./storage-validation";
import { recordGenerationSafely } from "./observability";

export async function generateSavedActivity(id) {
  // One transactional read includes the configuration and its ordered list.
  // Generation works on that consistent snapshot, outside the connection lock.
  const snapshot = await getConfiguration(id);
  const activityType = snapshot?.type;
  try {
    const saved = validateConfiguration(snapshot);
    const list = snapshot.wordList;
    requireInput(list && list.words.length >= 1 && list.words.length <= 30, "The saved list must contain 1–30 words.");
    let config;
    if (saved.type === "wordle") {
      const answer = list.words.find((word) => word.id === saved.answerWordId);
      requireInput(answer, "The saved answer is missing from this word list.");
      config = { answer: answer.phonemes, englishWord: answer.englishWord, hint: answer.hint, maxGuesses: saved.maxGuesses, showHints: saved.showHints };
    } else {
      config = {
        words: list.words.map((word) => word.phonemes), size: saved.gridSize, difficulty: saved.difficulty, showHints: saved.showHints,
        wordMetadata: list.words.map(({ id, englishWord, hint }) => ({ id, englishWord, hint })),
      };
    }
    const generated = generateActivity({ type: saved.type, title: saved.title, theme: saved.outputTheme, config });
    await recordGenerationSafely(activityType, true);
    return { ...generated, filename: saved.outputFilename, configuration: snapshot };
  } catch (error) {
    await recordGenerationSafely(activityType, false);
    throw error;
  }
}
