"use client";

import styles from "./GenerateButton.module.css";

export default function GenerateButton({
  onClick,
  disabled = false,
  prominent = false,
  children = "Generate",
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${prominent ? styles.prominent : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
