import { KEYBOARD_ROWS, bySymbol } from "@/data/phonemes";
import PhonemeButton from "./PhonemeButton";
import styles from "./PhonemeKeyboard.module.css";

export default function PhonemeKeyboard({ onSelect }) {
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
            {row.symbols.map((symbol) => {
              const phoneme = bySymbol(symbol);
              return (
                <PhonemeButton
                  key={symbol}
                  symbol={symbol}
                  label={phoneme.label}
                  onClick={onSelect}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
