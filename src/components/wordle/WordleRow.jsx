import { bySymbol } from "@/data/phonemes";
import WordleTile from "./WordleTile";
import styles from "./WordleRow.module.css";

export default function WordleRow({ guess, scores }) {
  return (
    <div className={styles.row} role="row">
      {guess.map((symbol, index) => (
        <WordleTile
          key={index}
          symbol={symbol}
          label={symbol ? bySymbol(symbol).label : ""}
          state={scores ? scores[index] : undefined}
        />
      ))}
    </div>
  );
}
