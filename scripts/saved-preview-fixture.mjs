import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Called only by preview-verification against its freshly owned database.
export async function seedSavedPreview(base, directory) {
  async function request(path, body) {
    const response = await fetch(`${base}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    assert.ok(response.ok, JSON.stringify(result)); return result.data;
  }
  const list = await request("/word-lists", { title: "Offline verification list", description: "Disposable browser QA records" });
  const chair = await request(`/word-lists/${list.id}/words`, { phonemes: ["tʃ", "eː"], englishWord: "chair", hint: "A seat" });
  await request(`/word-lists/${list.id}/words`, { phonemes: ["dʒ", "æ", "m"], englishWord: "jam", hint: "A spread" });
  const configurations = [
    { title: "Saved chair Wordle", type: "wordle", answerWordId: chair.id, maxGuesses: 4, outputTheme: "dark", outputFilename: "offline-wordle.html" },
    { title: "Saved classroom Search", type: "wordsearch", gridSize: 8, difficulty: "hard", outputTheme: "light", outputFilename: "offline-search.html" },
  ];
  for (const config of configurations) {
    const saved = await request("/configurations", { ...config, wordListId: list.id, showHints: true });
    const generated = await request(`/configurations/${saved.id}/generate`, {});
    const path = join(directory, generated.filename);
    // These are generated test artifacts, not edited application source.
    await writeFile(path, generated.html, "utf8");
    console.log(`${config.type} builder: ${base}/${config.type}?activity=${saved.id}`);
    console.log(`${config.type} offline file: ${path}`);
    if (generated.preview) console.log(`Offline search placements: ${JSON.stringify(generated.preview.placements)}`);
  }
}
