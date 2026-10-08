"use client";

import {
  describePhoneme,
  formatPhonemeWord,
  hintFor,
} from "@/data/phonemes";
import styles from "./PhonemeWordDisplay.module.css";

export default function PhonemeWordDisplay({
  word,
  onRemoveAt,
  onBackspace,
  onClear,
  action,
}) {
  return (
    <div className={styles.wrapper}>
      {word.length === 0 ? (
        <p className={styles.empty}>Click phonemes below to build a word</p>
      ) : (
        <div className={styles.transcription}>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
          <ul
            className={styles.chips}
            aria-label={`Phoneme word ${formatPhonemeWord(word)}`}
          >
            {word.map((symbol, index) => (
              <li key={`${symbol}-${index}`}>
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => onRemoveAt(index)}
                  aria-label={`Remove ${describePhoneme(symbol)}`}
                  title={hintFor(symbol)}
                >
                  {symbol}
                </button>
              </li>
            ))}
          </ul>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
        </div>
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
        {action}
      </div>
    </div>
  );
}
