"use client";

import { useState } from "react";
import WordleGrid from "./WordleGrid";
import PhonemeKeyboard from "@/components/phoneme/PhonemeKeyboard";
import PhonemeWordDisplay from "@/components/phoneme/PhonemeWordDisplay";
import { formatPhonemeWord } from "@/data/phonemes";
import { scoreGuess, isWin } from "@/lib/wordle/scoring";
import styles from "./WordlePreview.module.css";

export default function WordlePreview({
  answer,
  englishWord,
  maxGuesses,
  showHints,
}) {
  const [currentGuess, setCurrentGuess] = useState([]);
  const [submittedGuesses, setSubmittedGuesses] = useState([]);
  const [scores, setScores] = useState([]);

  if (answer.length === 0) {
    return (
      <p className={styles.empty}>Build a phoneme word to test the preview.</p>
    );
  }

  const won = scores.some(isWin);
  const lost = !won && submittedGuesses.length >= maxGuesses;
  const gameOver = won || lost;
  const attemptsLeft = maxGuesses - submittedGuesses.length;

  const handleSelect = (symbol) => {
    if (gameOver || currentGuess.length >= answer.length) return;
    setCurrentGuess((guess) => [...guess, symbol]);
  };

  const handleRemoveAt = (index) =>
    setCurrentGuess((guess) => guess.filter((_, i) => i !== index));

  const handleBackspace = () =>
    setCurrentGuess((guess) => guess.slice(0, -1));

  const handleClear = () => setCurrentGuess([]);

  const handleSubmit = () => {
    if (currentGuess.length !== answer.length || gameOver) return;
    setSubmittedGuesses((guesses) => [...guesses, currentGuess]);
    setScores((prev) => [...prev, scoreGuess(currentGuess, answer)]);
    setCurrentGuess([]);
  };

  const handleReset = () => {
    setCurrentGuess([]);
    setSubmittedGuesses([]);
    setScores([]);
  };

  return (
    <div className={styles.preview}>
      <WordleGrid
        wordLength={answer.length}
        guesses={maxGuesses}
        submittedGuesses={submittedGuesses}
        scores={scores}
      />

      <div aria-live="polite">
        {gameOver ? (
          <div className={styles.result}>
            <p>{won ? "Solved!" : "Out of guesses."}</p>
            <p>
              Phoneme word: <strong>{formatPhonemeWord(answer)}</strong>
            </p>
            <p>
              English word: <strong>{englishWord || "(not set)"}</strong>
            </p>
          </div>
        ) : (
          <p className={styles.attempts}>
            {attemptsLeft} guess{attemptsLeft === 1 ? "" : "es"} left —
            guess needs {answer.length} phonemes (currently{" "}
            {currentGuess.length})
          </p>
        )}
      </div>

      {gameOver ? (
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleReset}
        >
          Try again
        </button>
      ) : (
        <>
          <PhonemeWordDisplay
            word={currentGuess}
            onRemoveAt={handleRemoveAt}
            onBackspace={handleBackspace}
            onClear={handleClear}
          />
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleSubmit}
            disabled={currentGuess.length !== answer.length}
          >
            Submit guess
          </button>
          <PhonemeKeyboard onSelect={handleSelect} showHints={showHints} />
        </>
      )}
    </div>
  );
}
