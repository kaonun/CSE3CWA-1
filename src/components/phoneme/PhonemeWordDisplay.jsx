"use client";

import { bySymbol, hintFor } from "@/data/phonemes";
import styles from "./PhonemeWordDisplay.module.css";

export default function PhonemeWordDisplay({
  word,
  onRemoveAt,
  onBackspace,
  onClear,
}) {
  return (
    <div className={styles.wrapper}>
      {word.length === 0 ? (
        <p className={styles.empty}>Click phonemes below to build a word</p>
      ) : (
        <ul className={styles.chips} aria-label="Phoneme word">
          {word.map((symbol, index) => {
            const phoneme = bySymbol(symbol);
            return (
              <li key={`${symbol}-${index}`}>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => onRemoveAt(index)}
                  aria-label={`Remove ${phoneme.label} (${hintFor(symbol)})`}
                >
                  {phoneme.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onBackspace}
          disabled={word.length === 0}
        >
          Backspace
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onClear}
          disabled={word.length === 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
