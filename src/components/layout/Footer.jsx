import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>Phoneme&apos;le — a frontend-only activity builder (Assessment 1).</p>
        <p>Ali Mhanna — 22550592</p>
      </div>
    </footer>
  );
}
