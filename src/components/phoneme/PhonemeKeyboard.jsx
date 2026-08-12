import { KEYBOARD_ROWS } from "@/data/phonemes";
import PhonemeButton from "./PhonemeButton";
import styles from "./PhonemeKeyboard.module.css";

export default function PhonemeKeyboard({ onSelect, showHints = true }) {
  return (
    <div
      className={styles.keyboard}
      role="group"
      aria-label="Phoneme keyboard"
    >
      {KEYBOARD_ROWS.map((row) => (
        <div className={styles.row} key={row.title}>
          <h3 className={styles.rowTitle}>{row.title}</h3>
          <div className={styles.rowButtons}>
            {row.symbols.map((symbol) => (
              <PhonemeButton
                key={symbol}
                symbol={symbol}
                onClick={onSelect}
                showHint={showHints}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
