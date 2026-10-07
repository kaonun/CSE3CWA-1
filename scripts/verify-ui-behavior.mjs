import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import * as phonemes from "../src/data/phonemes.js";
import { savedActivityLabel } from "../src/lib/activity-labels.js";

const require = createRequire(import.meta.url);
const { loadBindings, transform } = require("next/dist/build/swc");
await loadBindings();

// Run our actual JSX components with tiny hook substitutes. This verifies event
// state and rendered markup without a browser, not CSS layout/focus heuristics.
// Only trusted project source is executed; Node's VM is not a security sandbox.
async function componentHarness(path) {
  const url = new URL(path, import.meta.url);
  const { code } = await transform(await readFile(url, "utf8"), {
    filename: fileURLToPath(url),
    jsc: { target: "es2022", parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
    module: { type: "commonjs" },
  });
  const state = [];
  let cursor = 0;
  const hooks = {
    useId: () => "unit-phoneme-hint",
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
  };
  const exports = {};
  new Script(code, { filename: fileURLToPath(url) }).runInNewContext({
    exports,
    require(id) {
      if (id === "react") return hooks;
      if (id === "@/data/phonemes") return phonemes;
      if (id.endsWith(".module.css")) return { wrapper: "wrapper", button: "button", hint: "hint" };
      if (id === "react/jsx-runtime" || id.startsWith("@swc/helpers/")) return require(id);
      throw new Error(`Unexpected component dependency: ${id}`);
    },
  }, { timeout: 1000 });
  return (props) => { cursor = 0; return exports.default(props); };
}

let passed = 0;
async function check(name, run) {
  await run(); passed++; console.log(`PASS ${name}`);
}
const renderDetails = await componentHarness("../src/components/builder/SavedActivityDetails.jsx");
const words = [
  { id: "first", phonemes: ["p", "n", "b"], englishWord: "Piggy" },
  { id: "second", phonemes: ["p", "m", "f"], englishWord: "Pmf" },
];
const saved = { title: "testh", type: "wordle", answerWordId: "second", wordList: { title: "Test", words } };

await check("activity labels explicitly distinguish each activity from its shared word list", () => {
  assert.equal(savedActivityLabel({ title: "testh", listTitle: "Test" }), "Activity: testh — Word list: Test");
  assert.equal(savedActivityLabel({ title: "k", listTitle: "Test" }), "Activity: k — Word list: Test");
});
await check("teacher Wordle summary identifies only the selected answer, even when it is not the first word", () => {
  const html = renderToStaticMarkup(renderDetails({ saved }));
  assert.match(html, /Activity: testh/); assert.match(html, /Source word list: Test/);
  assert.match(html, /Selected Wordle answer \(teacher view\)<\/h3><p><strong>\/p m f\/ — Pmf/);
  assert.match(html, /one correct answer/);
  assert.match(html, /\/p n b\/ — Piggy — Not this activity’s answer/);
  assert.match(html, /\/p m f\/ — Pmf — Selected answer/);
  assert.match(html, /<details><summary>Source word list \(2 words\)/);
  assert.doesNotMatch(html, /<details open/);
});
await check("single-word and multi-character answers retain complete tokens and clear labels", () => {
  const single = { ...saved, answerWordId: "first", wordList: { title: "Single", words: [{ ...words[0], phonemes: ["tʃ", "eː"], englishWord: "" }] } };
  const html = renderToStaticMarkup(renderDetails({ saved: single }));
  assert.match(html, /\/tʃ eː\/ — Untitled word/);
  assert.match(html, /Source word list \(1 word\)/);
});
await check("Word Search summary includes all target words without suggesting a single answer", () => {
  const html = renderToStaticMarkup(renderDetails({ saved: { ...saved, type: "wordsearch", answerWordId: null } }));
  assert.match(html, /Words included in this Word Search/);
  assert.match(html, /\/p n b\/ — Piggy/); assert.match(html, /\/p m f\/ — Pmf/);
  assert.doesNotMatch(html, /Selected answer|one correct answer|<details>/);
});
await check("teacher metadata remains escaped rather than interpreted as HTML", () => {
  const html = renderToStaticMarkup(renderDetails({ saved: { ...saved, title: "<script>example</script>" } }));
  assert.match(html, /&lt;script&gt;example&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

const renderButton = await componentHarness("../src/components/phoneme/PhonemeButton.jsx");
const selected = [];
const props = { symbol: "eː", onClick: (symbol) => selected.push(symbol) };
const buttonIn = (tree) => tree.props.children[0];
await check("phoneme hint keeps its accessible description and complete-token selection", () => {
  const tree = renderButton(props);
  assert.equal(tree.props["data-hint-dismissed"], false);
  assert.equal(buttonIn(tree).props["aria-describedby"], tree.props.children[1].props.id);
  assert.equal(buttonIn(tree).props["aria-label"], "Phoneme /eː/");
  buttonIn(tree).props.onClick();
  assert.deepEqual(selected, ["eː"]);
});
await check("pressing a phoneme dismisses its hint without removing keyboard focus", () => {
  const tree = renderButton(props);
  assert.equal(tree.props["data-hint-dismissed"], true);
  // Activation needs no event target and never calls blur().
  buttonIn(tree).props.onClick();
  assert.equal(renderButton(props).props["data-hint-dismissed"], true);
});
await check("re-entering a key or focusing it anew makes the hint available again", () => {
  renderButton(props).props.onPointerEnter();
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
  buttonIn(renderButton(props)).props.onClick();
  buttonIn(renderButton(props)).props.onFocus();
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
});
await check("Escape dismisses a hint and other keys do not dismiss it", () => {
  buttonIn(renderButton(props)).props.onKeyDown({ key: "ArrowRight" });
  assert.equal(renderButton(props).props["data-hint-dismissed"], false);
  buttonIn(renderButton(props)).props.onKeyDown({ key: "Escape" });
  assert.equal(renderButton(props).props["data-hint-dismissed"], true);
});
await check("disabled keys and hints-off retain their intended control semantics", () => {
  const tree = renderButton({ ...props, disabled: true, showHint: false });
  assert.equal(buttonIn(tree).props.disabled, true);
  assert.equal(buttonIn(tree).props["aria-describedby"], undefined);
  assert.equal(tree.props.children[1], false);
});
await check("React and offline styles suppress dismissed hints and use keyboard-only focus visibility", async () => {
  for (const path of ["../src/components/phoneme/PhonemeButton.module.css", "../src/lib/export/styles.js"]) {
    const css = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(css, /:not\(\[data-hint-dismissed="true"\]\):hover/);
    assert.match(css, /:focus-visible \+/);
    assert.doesNotMatch(css, /:focus-within/);
  }
});
console.log(`\n${passed} UI behavior checks passed (component state/markup, not browser layout).`);
