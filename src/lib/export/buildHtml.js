import { documentShell } from "./documentShell.js";
import { styles } from "./styles.js";
import { wordleTemplate } from "./wordleTemplate.js";
import { wordsearchTemplate } from "./wordsearchTemplate.js";

export function buildHtml({ type, config }) {
  if (type === "wordle") {
    const { body, script } = wordleTemplate(config);
    return documentShell({
      title: "Phoneme Wordle",
      styles: styles(),
      body,
      script,
    });
  }

  if (type === "wordsearch") {
    const { body, script } = wordsearchTemplate(config);
    return documentShell({
      title: "Phoneme Word Search",
      styles: styles(),
      body,
      script,
    });
  }

  throw new Error(`Unknown export type: ${type}`);
}
