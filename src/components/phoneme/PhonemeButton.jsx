"use client";

import { useId } from "react";
import { hintFor } from "@/data/phonemes";
import styles from "./PhonemeButton.module.css";

export default function PhonemeButton({
  symbol,
  label,
  onClick,
  selected = false,
  disabled = false,
  showHint = true,
}) {
  const hintId = useId();

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        aria-pressed={selected}
        aria-describedby={showHint ? hintId : undefined}
        disabled={disabled}
        onClick={() => onClick?.(symbol)}
      >
        {label}
      </button>
      {showHint && (
        <span id={hintId} className={styles.hint}>
          {hintFor(symbol)}
        </span>
      )}
    </span>
  );
}
