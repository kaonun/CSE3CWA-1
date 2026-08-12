import styles from "./SettingsField.module.css";

export default function SettingsField({ label, htmlFor, hint, children }) {
  if (htmlFor) {
    return (
      <div className={styles.field}>
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
        </label>
        {children}
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
    );
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.label}>{label}</legend>
      {children}
      {hint && <p className={styles.hint}>{hint}</p>}
    </fieldset>
  );
}
