import { describePhoneme, hintFor } from "@/data/phonemes";
import styles from "./WordleTile.module.css";

const STATE_LABEL = {
  correct: "correct position",
  present: "present, wrong position",
  absent: "not in word",
};

const STATE_ICON = {
  correct: "✓",
  present: "◆",
  absent: "✕",
};

export default function WordleTile({ symbol, state }) {
  if (!symbol) {
    return <div className={styles.tile} role="cell" aria-label="empty" />;
  }

  const ariaLabel = state
    ? `${describePhoneme(symbol)}, ${STATE_LABEL[state]}`
    : describePhoneme(symbol);

  return (
    <div
      className={`${styles.tile} ${state ? styles[state] : ""}`}
      role="cell"
      aria-label={ariaLabel}
      title={hintFor(symbol)}
    >
      {state && (
        <span className={styles.icon} aria-hidden="true">
          {STATE_ICON[state]}
        </span>
      )}
      <span className={styles.label}>{symbol}</span>
    </div>
  );
}
