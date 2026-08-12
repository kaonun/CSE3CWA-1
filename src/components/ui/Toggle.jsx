"use client";

import styles from "./Toggle.module.css";

export default function Toggle({ id, label, checked, onChange }) {
  return (
    <label className={styles.wrapper} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={styles.switch}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} aria-hidden="true" />
      </button>
    </label>
  );
}
