import WordleRow from "./WordleRow";
import styles from "./WordleGrid.module.css";

export default function WordleGrid({
  wordLength,
  guesses,
  submittedGuesses,
  scores,
}) {
  const rows = [];
  for (let i = 0; i < guesses; i++) {
    const guess = submittedGuesses[i];
    rows.push(
      <WordleRow
        key={i}
        guess={guess || new Array(wordLength).fill(null)}
        scores={guess ? scores[i] : null}
      />,
    );
  }

  return (
    <div className={styles.grid} role="table" aria-label="Wordle guesses">
      {rows}
    </div>
  );
}
