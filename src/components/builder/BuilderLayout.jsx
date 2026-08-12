import styles from "./BuilderLayout.module.css";

export default function BuilderLayout({ controls, preview }) {
  return (
    <div className={styles.layout}>
      <div className={styles.controls}>{controls}</div>
      <div className={styles.preview}>{preview}</div>
    </div>
  );
}
