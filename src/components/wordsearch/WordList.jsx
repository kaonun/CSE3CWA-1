"use client";

import PhonemeKeyboard from "@/components/phoneme/PhonemeKeyboard";
import PhonemeWordDisplay from "@/components/phoneme/PhonemeWordDisplay";
import { formatPhonemeWord, hintFor } from "@/data/phonemes";
import styles from "./WordList.module.css";

export default function WordList({
  words,
  onRemoveWord,
  builderWord,
  onSelectPhoneme,
  onRemoveAt,
  onBackspace,
  onClear,
  onAddWord,
}) {
  return (
    <div className={styles.wrapper}>
      <ul className={styles.words}>
        {words.map((word, index) => (
          <li key={index} className={styles.wordRow}>
            <span className={styles.wordChips}>
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
              {word.map((symbol, i) => (
                <span key={i} className={styles.chip} title={hintFor(symbol)}>
                  {symbol}
                </span>
              ))}
              <span className={styles.slash} aria-hidden="true">
                /
              </span>
            </span>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => onRemoveWord(index)}
              aria-label={`Remove phoneme word ${formatPhonemeWord(word)}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className={styles.builder}>
        <PhonemeWordDisplay
          word={builderWord}
          onRemoveAt={onRemoveAt}
          onBackspace={onBackspace}
          onClear={onClear}
        />
        <button
          type="button"
          className={styles.addButton}
          onClick={onAddWord}
          disabled={builderWord.length === 0}
        >
          Add word
        </button>
        <PhonemeKeyboard onSelect={onSelectPhoneme} />
      </div>
    </div>
  );
}
