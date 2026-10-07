"use client";

import { useState } from "react";
import PhonemeKeyboard from "@/components/phoneme/PhonemeKeyboard";
import PhonemeWordDisplay from "@/components/phoneme/PhonemeWordDisplay";

export function ListForm({ list, save, cancel }) {
  const [title, setTitle] = useState(list?.title || "");
  const [description, setDescription] = useState(list?.description || "");
  return <form onSubmit={(event) => { event.preventDefault(); save({ title, description }); }}>
    <h3>{list ? "Edit list details" : "New word list"}</h3>
    <label>List title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Description<textarea maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <button type="submit">{list ? "Save list details" : "Create list"}</button>{cancel && <button type="button" onClick={cancel}>Cancel list edit</button>}
  </form>;
}

export function WordForm({ word, save, cancel }) {
  const [phonemes, setPhonemes] = useState(word?.phonemes || []);
  const [englishWord, setEnglishWord] = useState(word?.englishWord || "");
  const [hint, setHint] = useState(word?.hint || "");
  return <form onSubmit={(event) => { event.preventDefault(); save({ phonemes, englishWord, hint }); }}>
    <h3>{word ? "Edit word" : "Add word"}</h3>
    <p>Choose complete phoneme symbols in order (1–15 tokens).</p>
    <PhonemeWordDisplay word={phonemes} onRemoveAt={(index) => setPhonemes((tokens) => tokens.filter((_, i) => i !== index))}
      onBackspace={() => setPhonemes((tokens) => tokens.slice(0, -1))} onClear={() => setPhonemes([])} />
    <PhonemeKeyboard onSelect={(symbol) => setPhonemes((tokens) => tokens.length < 15 ? [...tokens, symbol] : tokens)} />
    <p role="status">{phonemes.length === 0 ? "Select at least one phoneme before saving." : phonemes.length === 15 ? "15-token limit reached. Remove a phoneme before adding another." : `${phonemes.length}/15 phonemes selected.`}</p>
    <label>English word<input maxLength={120} value={englishWord} onChange={(event) => setEnglishWord(event.target.value)} /></label>
    <label>Word hint<input maxLength={300} value={hint} onChange={(event) => setHint(event.target.value)} /></label>
    <button type="submit" disabled={!phonemes.length}>{word ? "Save word" : "Add word to list"}</button>
    {word && <button type="button" onClick={cancel}>Cancel word edit</button>}
  </form>;
}

export function ConfigurationForm({ activity, list, save, cancel }) {
  const [title, setTitle] = useState(activity?.title || "");
  const [type, setType] = useState(activity?.type || "wordle");
  const [answerWordId, setAnswer] = useState(activity?.answerWordId || list.words[0]?.id || "");
  const [maxGuesses, setGuesses] = useState(activity?.maxGuesses ?? 6);
  const [gridSize, setSize] = useState(activity?.gridSize ?? 10);
  const [difficulty, setDifficulty] = useState(activity?.difficulty || "easy");
  const [showHints, setHints] = useState(activity?.showHints ?? true);
  const [outputTheme, setTheme] = useState(activity?.outputTheme || "light");
  const [outputFilename, setFilename] = useState(activity?.outputFilename || "phonemele-activity.html");
  function submit(event) {
    event.preventDefault();
    save({ title, type, wordListId: list.id, showHints, outputTheme, outputFilename,
      ...(type === "wordle" ? { answerWordId, maxGuesses } : { gridSize, difficulty }) });
  }
  return <form onSubmit={submit}>
    <h3>{activity ? "Edit activity configuration" : "New activity configuration"}</h3>
    <p>Source word list: {list.title}. The activity title below names this game, not the word list.</p>
    <label>Activity title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Activity type<select disabled={!!activity} value={type} onChange={(event) => setType(event.target.value)}><option value="wordle">Wordle</option><option value="wordsearch">Word Search</option></select></label>
    {type === "wordle" ? <>
      <p>Choose exactly one correct answer. Other words in this list are not alternative answers for this Wordle.</p>
      <label>Answer word<select required value={answerWordId} onChange={(event) => setAnswer(event.target.value)}>{list.words.map((word) => <option key={word.id} value={word.id}>{word.englishWord || "Untitled word"} /{word.phonemes.join(" ")}/</option>)}</select></label>
      <label>Maximum guesses<input type="number" required min={3} max={8} step={1} value={maxGuesses} onChange={(event) => setGuesses(Number(event.target.value))} /></label>
    </> : <>
      <label>Saved grid size<input type="number" required min={6} max={15} step={1} value={gridSize} onChange={(event) => setSize(Number(event.target.value))} /></label>
      <label>Saved difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Easy</option><option value="hard">Hard</option></select></label>
    </>}
    <label><input type="checkbox" checked={showHints} onChange={(event) => setHints(event.target.checked)} /> Show hints</label>
    <label>Output theme<select value={outputTheme} onChange={(event) => setTheme(event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
    <label>Output filename<input required maxLength={120} pattern="[A-Za-z0-9._-]+\.html" value={outputFilename} onChange={(event) => setFilename(event.target.value)} /></label>
    <p>Use letters, numbers, dots, underscores or hyphens, ending in .html.</p>
    <button type="submit" disabled={!list.words.length}>{activity ? "Save configuration" : "Create configuration"}</button>
    {activity && <button type="button" onClick={cancel}>Cancel configuration edit</button>}
  </form>;
}
