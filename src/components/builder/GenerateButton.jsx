"use client";

import styles from "./GenerateButton.module.css";

export default function GenerateButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
    >
      Generate
    </button>
  );
}
