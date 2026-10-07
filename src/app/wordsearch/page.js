"use client";

import { Suspense, useEffect, useState } from "react";
import SavedActivityPanel from "@/components/builder/SavedActivityPanel";
import BuilderLayout from "@/components/builder/BuilderLayout";
import SettingsField from "@/components/builder/SettingsField";
import GenerateButton from "@/components/builder/GenerateButton";
import NumberInput from "@/components/ui/NumberInput";
import WordList from "@/components/wordsearch/WordList";
import WordSearchGrid from "@/components/wordsearch/WordSearchGrid";
import { requestActivity } from "@/lib/api/activities";
import { downloadHtml } from "@/lib/export/download";
import { getActiveTheme } from "@/lib/theme";
import styles from "./page.module.css";

const MIN_SIZE = 6;
const MAX_SIZE = 15;

export default function WordSearchPage() {
  const [words, setWords] = useState([]);
  const [builderWord, setBuilderWord] = useState([]);
  const [size, setSize] = useState(10);
  const [difficulty, setDifficulty] = useState("easy");
  const [response, setResponse] = useState(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify({ words, size, difficulty, retry });
  const currentResponse = response?.key === requestKey ? response : null;
  const loading = words.length > 0 && !currentResponse;
  const activity = currentResponse?.activity;

  useEffect(() => {
    const { words, size, difficulty } = JSON.parse(requestKey);
    if (words.length === 0) return;
    const controller = new AbortController();
    // Coalesce quick changes and discard responses for superseded settings.
    const timer = setTimeout(async () => {
      try {
        const activity = await requestActivity({
          type: "wordsearch",
          theme: getActiveTheme(),
          config: { words, size, difficulty },
        }, controller.signal);
        if (!controller.signal.aborted) setResponse({ key: requestKey, activity });
      } catch (error) {
        if (!controller.signal.aborted) setResponse({ key: requestKey, error: error.message });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestKey]);

  const handleSelectPhoneme = (symbol) =>
    setBuilderWord((word) => [...word, symbol]);

  const handleRemoveAt = (index) =>
    setBuilderWord((word) => word.filter((_, i) => i !== index));

  const handleBackspace = () => setBuilderWord((word) => word.slice(0, -1));

  const handleClear = () => setBuilderWord([]);

  const handleAddWord = () => {
    if (builderWord.length === 0) return;
    setWords((list) => [...list, builderWord]);
    setBuilderWord([]);
  };

  const handleRemoveWord = (index) =>
    setWords((list) => list.filter((_, i) => i !== index));

  const handleSizeChange = (value) => {
    if (Number.isNaN(value)) return;
    setSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, value)));
  };

  const handleGenerate = () => {
    if (activity && words.length > 0) downloadHtml(activity.filename, activity.html);
  };

  const controls = (
    <div className={styles.controls}>
      <div className={styles.header}>
        <h2>Word Search builder</h2>
        <GenerateButton
          onClick={handleGenerate}
          disabled={words.length === 0 || !activity}
        />
      </div>

      <SettingsField label="Word list">
        <WordList
          words={words}
          onRemoveWord={handleRemoveWord}
          builderWord={builderWord}
          onSelectPhoneme={handleSelectPhoneme}
          onRemoveAt={handleRemoveAt}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onAddWord={handleAddWord}
        />
      </SettingsField>

      <NumberInput
        id="grid-size"
        label="Grid size"
        value={size}
        onChange={handleSizeChange}
        min={MIN_SIZE}
        max={MAX_SIZE}
      />

      <SettingsField label="Difficulty" htmlFor="difficulty">
        <select
          id="difficulty"
          className={styles.select}
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        >
          <option value="easy">Easy (across and down)</option>
          <option value="hard">Hard (+ diagonals and reversed)</option>
        </select>
      </SettingsField>
    </div>
  );

  const preview = words.length === 0 ? (
    <p role="status">Add words to generate a grid.</p>
  ) : currentResponse?.error ? (
    <div>
      <p role="alert">{currentResponse.error}</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button>
    </div>
  ) : loading ? (
    <p role="status">Preparing your word search…</p>
  ) : (
    <WordSearchGrid
      key={`${requestKey}:${JSON.stringify(activity.preview)}`}
      grid={activity.preview.grid}
      placements={activity.preview.placements}
      failed={activity.preview.failed}
    />
  );

  return <>
    <Suspense fallback={<p role="status">Loading saved activities…</p>}><SavedActivityPanel type="wordsearch" /></Suspense>
    <details><summary>Temporary Word Search editor (not saved)</summary>
      <p>This editor does not change the Library. Its download uses temporary values and your current theme.</p>
      <BuilderLayout controls={controls} preview={preview} />
    </details>
  </>;
}
