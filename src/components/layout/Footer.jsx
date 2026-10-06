import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>Phoneme&apos;le — phoneme-based classroom activities.</p>
        <p>Ali Mhanna — 22550592</p>
      </div>
    </footer>
  );
}
