import { documentShell } from "./documentShell.js";
import { styles } from "./styles.js";
import { wordleTemplate } from "./wordleTemplate.js";
import { wordsearchTemplate } from "./wordsearchTemplate.js";

export function buildHtml({ type, config, theme = "light" }) {
  const exportTheme = theme === "dark" ? "dark" : "light";

  if (type === "wordle") {
    const { body, script } = wordleTemplate(config);
    return documentShell({
      title: "Phoneme Wordle",
      theme: exportTheme,
      styles: styles(exportTheme),
      body,
      script,
    });
  }

  if (type === "wordsearch") {
    const { body, script } = wordsearchTemplate(config);
    return documentShell({
      title: "Phoneme Word Search",
      theme: exportTheme,
      styles: styles(exportTheme),
      body,
      script,
    });
  }

  throw new Error(`Unknown export type: ${type}`);
}
