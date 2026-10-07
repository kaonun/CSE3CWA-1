"use client";

import { useId, useState } from "react";
import { formatPhoneme, hintFor } from "@/data/phonemes";
import styles from "./PhonemeButton.module.css";

export default function PhonemeButton({
  symbol,
  onClick,
  disabled = false,
  showHint = true,
}) {
  const hintId = useId();
  const [hintDismissed, setHintDismissed] = useState(false);

  return (
    <span className={styles.wrapper} data-hint-dismissed={hintDismissed}
      onPointerEnter={() => setHintDismissed(false)}>
      <button
        type="button"
        className={styles.button}
        aria-label={`Phoneme ${formatPhoneme(symbol)}`}
        aria-describedby={showHint ? hintId : undefined}
        disabled={disabled}
        onFocus={() => setHintDismissed(false)}
        onKeyDown={(event) => { if (event.key === "Escape") setHintDismissed(true); }}
        onClick={() => {
          // Dismiss the hint without blurring the key or disrupting keyboard use.
          setHintDismissed(true);
          onClick?.(symbol);
        }}
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
