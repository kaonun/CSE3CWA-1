"use client";

import { useId } from "react";
import { formatPhoneme, hintFor } from "@/data/phonemes";
import styles from "./PhonemeButton.module.css";

export default function PhonemeButton({
  symbol,
  onClick,
  disabled = false,
  showHint = true,
}) {
  const hintId = useId();

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Phoneme ${formatPhoneme(symbol)}`}
        aria-describedby={showHint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onClick?.(symbol)}
      >
        {formatPhoneme(symbol)}
      </button>
      {showHint && (
        <span id={hintId} className={styles.hint}>
          {hintFor(symbol)}
        </span>
      )}
    </span>
  );
}
