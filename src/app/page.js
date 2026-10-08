import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.hero}>
      <h2>Phoneme&apos;le</h2>
      <p className={styles.lead}>
        A builder for phoneme-based classroom activities. Build a Wordle or
        Word Search from Australian English phonemes, preview it live, and
        export a single offline HTML file your students can play — no
        server, no build step, no typing IPA.
      </p>
      <div className={styles.links}>
        <Link href="/dashboard" className={styles.card}>
          <h3>Dashboard</h3>
          <p>
            Monitor stored builder data, simulated usage metrics, alerts and
            operational health.
          </p>
        </Link>
        <Link href="/wordle" className={styles.card}>
          <h3>Wordle</h3>
          <p>
            Build a phoneme word, set hints and guesses, export a playable
            game.
          </p>
        </Link>
        <Link href="/wordsearch" className={styles.card}>
          <h3>Word Search</h3>
          <p>
            Build a word list, choose a grid size and difficulty, export a
            puzzle.
          </p>
        </Link>
        <Link href="/about" className={styles.card}>
          <h3>About</h3>
          <p>What this project is, how it works, and the how-to video.</p>
        </Link>
      </div>
    </div>
  );
}
