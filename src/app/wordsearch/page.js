"use client";

import { useEffect, useState } from "react";
import BuilderLayout from "@/components/builder/BuilderLayout";
import SettingsField from "@/components/builder/SettingsField";
import GenerateButton from "@/components/builder/GenerateButton";
import NumberInput from "@/components/ui/NumberInput";
import WordList from "@/components/wordsearch/WordList";
import WordSearchGrid from "@/components/wordsearch/WordSearchGrid";
import { generateWordSearch } from "@/lib/wordsearch/generate";
import { buildHtml } from "@/lib/export/buildHtml";
import { downloadHtml } from "@/lib/export/download";
import styles from "./page.module.css";

const MIN_SIZE = 6;
const MAX_SIZE = 15;

const DEFAULT_WORDS = [
  ["k", "æ", "t"], // cat
  ["d", "ɔ", "g"], // dog
  ["f", "ɪ", "ʃ"], // fish
  ["b", "ɜː", "d"], // bird
  ["s", "ɐ", "n"], // sun
];

export default function WordSearchPage() {
  const [words, setWords] = useState(DEFAULT_WORDS);
  const [builderWord, setBuilderWord] = useState([]);
  const [size, setSize] = useState(10);
  const [difficulty, setDifficulty] = useState("easy");

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

  // Grid generation uses Math.random(), so it must run client-only — doing
  // it during render would make the server-rendered grid disagree with the
  // client's on hydration. Starting from an empty grid keeps first paint
  // identical on both sides; the effect fills in the real layout after mount.
  const [result, setResult] = useState({ grid: [], placements: [], failed: [] });

  useEffect(() => {
    const opts = {
      diagonals: difficulty === "hard",
      reversals: difficulty === "hard",
    };
    setResult(generateWordSearch(words, size, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(words), size, difficulty]);

  const handleGenerate = () => {
    const html = buildHtml({
      type: "wordsearch",
      config: {
        grid: result.grid,
        placements: result.placements,
      },
    });
    downloadHtml("phonemele-wordsearch.html", html);
  };

  const controls = (
    <div className={styles.controls}>
      <div className={styles.header}>
        <h2>Word Search builder</h2>
        <GenerateButton
          onClick={handleGenerate}
          disabled={words.length === 0}
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

  const preview = (
    <WordSearchGrid
      grid={result.grid}
      placements={result.placements}
      failed={result.failed}
    />
  );

  return <BuilderLayout controls={controls} preview={preview} />;
}
