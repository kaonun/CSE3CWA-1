import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Speech Pathology Activity Builder</p>
        <h1 className={styles.title}>Phoneme&apos;le</h1>
      </div>
    </header>
  );
}
