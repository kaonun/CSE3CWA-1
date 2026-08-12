import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import ThemeToggle from "@/components/settings/ThemeToggle";
import styles from "./page.module.css";

export const metadata = {
  title: "Settings — Phoneme'le",
};

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <section className={styles.section}>
      <h2>Settings</h2>
      <p className={styles.description}>
        Your theme choice is saved in a cookie, so it persists across visits
        and page reloads.
      </p>
      <ThemeToggle initialTheme={theme} />
    </section>
  );
}
