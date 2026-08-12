"use client";

import { useState } from "react";
import BuilderLayout from "@/components/builder/BuilderLayout";
import SettingsField from "@/components/builder/SettingsField";
import GenerateButton from "@/components/builder/GenerateButton";
import Toggle from "@/components/ui/Toggle";
import NumberInput from "@/components/ui/NumberInput";
import PhonemeWordDisplay from "@/components/phoneme/PhonemeWordDisplay";
import PhonemeKeyboard from "@/components/phoneme/PhonemeKeyboard";
import WordlePreview from "@/components/wordle/WordlePreview";
import { buildHtml } from "@/lib/export/buildHtml";
import { downloadHtml } from "@/lib/export/download";
import { getActiveTheme } from "@/lib/theme";
import styles from "./page.module.css";

const MIN_GUESSES = 3;
const MAX_GUESSES = 8;

export default function WordlePage() {
  const [phonemeWord, setPhonemeWord] = useState([]);
  const [englishWord, setEnglishWord] = useState("");
  const [showHints, setShowHints] = useState(true);
  const [guesses, setGuesses] = useState(6);

  const handleSelectPhoneme = (symbol) =>
    setPhonemeWord((word) => [...word, symbol]);

  const handleRemoveAt = (index) =>
    setPhonemeWord((word) => word.filter((_, i) => i !== index));

  const handleBackspace = () => setPhonemeWord((word) => word.slice(0, -1));

  const handleClear = () => setPhonemeWord([]);

  const handleGuessesChange = (value) => {
    if (Number.isNaN(value)) return;
    setGuesses(Math.min(MAX_GUESSES, Math.max(MIN_GUESSES, value)));
  };

  const handleGenerate = () => {
    const html = buildHtml({
      type: "wordle",
      theme: getActiveTheme(),
      config: {
        answer: phonemeWord,
        englishWord,
        maxGuesses: guesses,
        showHints,
      },
    });
    downloadHtml("phonemele-wordle.html", html);
  };

  const controls = (
    <div className={styles.controls}>
      <div className={styles.header}>
        <h2>Wordle builder</h2>
      </div>

      <SettingsField label="Phoneme word">
        <PhonemeWordDisplay
          word={phonemeWord}
          onRemoveAt={handleRemoveAt}
          onBackspace={handleBackspace}
          onClear={handleClear}
        />
        <PhonemeKeyboard onSelect={handleSelectPhoneme} />
      </SettingsField>

      <SettingsField label="English word" htmlFor="english-word">
        <input
          id="english-word"
          type="text"
          className={styles.textInput}
          value={englishWord}
          onChange={(event) => setEnglishWord(event.target.value)}
        />
      </SettingsField>

      <Toggle
        id="show-hints"
        label="Show hints"
        checked={showHints}
        onChange={setShowHints}
      />

      <NumberInput
        id="guess-count"
        label="Number of guesses"
        value={guesses}
        onChange={handleGuessesChange}
        min={MIN_GUESSES}
        max={MAX_GUESSES}
      />

      <div className={styles.generateAction}>
        <GenerateButton
          onClick={handleGenerate}
          disabled={phonemeWord.length === 0}
          prominent
        >
          Generate Wordle activity
        </GenerateButton>
        <p className={styles.generateHint}>
          Downloads a standalone HTML activity using your current theme.
        </p>
      </div>
    </div>
  );

  const preview = (
    <section className={styles.previewSection} aria-labelledby="wordle-preview-title">
      <h2 id="wordle-preview-title">Live preview</h2>
      <p className={styles.previewHint}>
        Test the activity here before downloading the student version.
      </p>
      <WordlePreview
        key={`${JSON.stringify(phonemeWord)}:${guesses}`}
        answer={phonemeWord}
        englishWord={englishWord}
        maxGuesses={guesses}
        showHints={showHints}
      />
    </section>
  );

  return <BuilderLayout controls={controls} preview={preview} />;
}
