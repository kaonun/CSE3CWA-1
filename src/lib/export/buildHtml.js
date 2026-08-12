import { documentShell } from "./documentShell.js";
import { styles } from "./styles.js";
import { wordleTemplate } from "./wordleTemplate.js";

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

  throw new Error(`Unknown export type: ${type}`);
}
