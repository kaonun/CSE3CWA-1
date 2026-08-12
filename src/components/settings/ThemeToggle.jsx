"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Toggle from "@/components/ui/Toggle";
import { THEME_COOKIE } from "@/lib/theme";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ initialTheme }) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);

  function handleChange(checked) {
    const next = checked ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className={styles.field}>
      <Toggle
        id="theme-toggle"
        label="Dark theme"
        checked={theme === "dark"}
        onChange={handleChange}
      />
      {!theme && (
        <p className={styles.hint}>
          No preference saved yet — following your system setting until you
          choose one.
        </p>
      )}
    </div>
  );
}
