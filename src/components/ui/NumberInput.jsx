"use client";

import styles from "./NumberInput.module.css";

export default function NumberInput({ id, label, value, onChange, min, max, step = 1 }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        className={styles.input}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
